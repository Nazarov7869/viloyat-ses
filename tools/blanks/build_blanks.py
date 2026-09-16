#!/usr/bin/env python3
"""
hujjattlar/ papkasidagi asl blankalardan veb-blanka shablonlarini yasaydi.

Natija:
  frontend/public/blanks/manifest.json      — barcha shablonlar va maydonlar
  frontend/public/blanks/<key>/p<N>.svg     — sahifaning asl ko'rinishi (vektor)
  backend/catalog/blank_templates.json      — Django admin uchun kalit/nom ro'yxati

Talablar (faqat shu skriptni ishga tushiradigan kompyuterda; serverga kerak emas):
  LibreOffice (soffice), poppler-utils (pdftocairo),
  pip install pdfplumber pymupdf openpyxl

Ishga tushirish (loyiha ildizidan):
  python tools/blanks/build_blanks.py
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import fitz  # PyMuPDF
import openpyxl
import pdfplumber

sys.path.insert(0, str(Path(__file__).parent))
from config import BLANKS, LAB_GROUPS  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = ROOT / "hujjattlar"
OUT_DIR = ROOT / "frontend" / "public" / "blanks"
BACKEND_JSON = ROOT / "backend" / "catalog" / "blank_templates.json"

MIN_UNDERSCORES = 3
LINE_HEIGHT = 13.0


# --------------------------------------------------------------------------- #
# 1. Asl faylni PDF ga aylantirish
# --------------------------------------------------------------------------- #

def soffice_bin() -> str:
    for name in ("soffice", "libreoffice"):
        path = shutil.which(name)
        if path:
            return path
    raise SystemExit("LibreOffice (soffice) topilmadi")


def clear_ochiq_suv(ws):
    """Ochiq suv blankasida qolib ketgan 2022 yilgi namunaviy ma'lumotlarni tozalash."""
    ws["A7"] = "ПРОТОКОЛИ  №______"
    ws["C8"] = "Намуна номи " + "_" * 70
    ws["C9"] = "Манзили " + "_" * 74
    ws["C10"] = "Намуна олинган сана " + "_" * 62
    ws["C11"] = "Текширув утказилган сана " + "_" * 57
    for row in ws.iter_rows(min_row=16, max_row=19, min_col=2, max_col=14):
        for cell in row:
            cell.value = None
    ws["B21"] = "Лаборатория мудири.   " + "_" * 60
    ws["B22"] = "Лаборатория врачи.    " + "_" * 60


XLSX_CLEANERS = {"bak_ochiq_suv": clear_ochiq_suv}


def prepare_source(entry: dict, workdir: Path) -> Path:
    src = SRC_DIR / entry["source"]
    if not src.exists():
        raise SystemExit(f"Fayl topilmadi: {src}")
    dst = workdir / f"{entry['key']}{src.suffix.lower()}"

    if src.suffix.lower() == ".xlsx":
        wb = openpyxl.load_workbook(src)
        keep = wb.worksheets[entry.get("sheet", 0)]
        for ws in list(wb.worksheets):
            if ws is not keep:
                wb.remove(ws)
        for row in keep.iter_rows():
            for cell in row:
                if isinstance(cell.value, str) and not cell.value.strip():
                    cell.value = None
        cleaner = XLSX_CLEANERS.get(entry.get("clear_xlsx", ""))
        if cleaner:
            cleaner(keep)
        # Bir sahifa kengligiga sig'dirish (asl chop etish ko'rinishi kabi)
        keep.page_setup.fitToWidth = 1
        keep.page_setup.fitToHeight = 1
        keep.sheet_properties.pageSetUpPr.fitToPage = True
        wb.save(dst)
    else:
        shutil.copy(src, dst)
    return dst


def to_pdf(path: Path, workdir: Path) -> Path:
    subprocess.run(
        [soffice_bin(), "--headless", "--convert-to", "pdf", "--outdir", str(workdir), str(path)],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    pdf = workdir / (path.stem + ".pdf")
    if not pdf.exists():
        raise SystemExit(f"PDF yaratilmadi: {path}")
    return pdf


# --------------------------------------------------------------------------- #
# 2. Sahifalarni tanlash va namunaviy ma'lumotlarni o'chirish
# --------------------------------------------------------------------------- #

def select_and_redact(pdf_path: Path, entry: dict, workdir: Path):
    """Kerakli sahifalarni ajratadi, redaksiya qiladi. (yangi pdf, redaksiya maydonlari)"""
    src = fitz.open(pdf_path)
    pages = entry.get("pages")
    if pages is None:
        pages = list(range(src.page_count))
    out = fitz.open()
    for p in pages:
        out.insert_pdf(src, from_page=p, to_page=p)

    extra_fields = []
    for spec in entry.get("redact", []):
        for pno in range(out.page_count):
            page = out[pno]
            clip = fitz.Rect(*spec["clip"]) if spec.get("clip") else None
            for rect in page.search_for(spec["text"], clip=clip):
                page.add_redact_annot(rect, fill=(1, 1, 1))
                if spec.get("field"):
                    extra_fields.append({
                        "page": pno,
                        "x": rect.x0, "y": rect.y0,
                        "w": rect.width, "h": rect.height,
                        "kind": "line", "label": "", "fs": min(12.0, rect.height * 0.8),
                        "underline": False, "grow": True,
                    })
    for page in out:
        page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
    new_path = workdir / f"{entry['key']}-selected.pdf"
    out.save(new_path, garbage=3, deflate=True)
    return new_path, extra_fields


# --------------------------------------------------------------------------- #
# 3. To'ldiriladigan maydonlarni aniqlash
# --------------------------------------------------------------------------- #

def _group_lines(chars, tol=2.0):
    lines = []
    for ch in sorted(chars, key=lambda c: (round(c["bottom"]), c["x0"])):
        for line in lines:
            if abs(line["bottom"] - ch["bottom"]) <= tol:
                line["chars"].append(ch)
                break
        else:
            lines.append({"bottom": ch["bottom"], "chars": [ch]})
    for line in lines:
        line["chars"].sort(key=lambda c: c["x0"])
    return lines


def _label_before(line_chars, x0, max_len=60, max_gap=30.0):
    """Maydondan chapdagi yaqin matn (boshqa nusxadagi uzoq matn olinmaydi)."""
    left = [c for c in line_chars if c["x1"] <= x0 + 0.5]
    picked = []
    edge = x0
    for c in reversed(left):
        if c["text"] == "_":
            edge = c["x0"]
            continue
        if not c["text"].strip():
            continue
        if edge - c["x1"] > max_gap:
            break
        picked.append(c)
        edge = c["x0"]
    picked.reverse()
    text = ""
    for i, c in enumerate(picked):
        if i and c["x0"] - picked[i - 1]["x1"] > c["size"] * 0.15:
            text += " "
        text += c["text"]
    return re.sub(r"\s+", " ", text).strip()[-max_len:]


def underscore_fields(page, pno):
    fields = []
    for line in _group_lines(page.chars):
        chars = line["chars"]
        run = []

        def flush():
            if len(run) >= MIN_UNDERSCORES:
                x0, x1 = run[0]["x0"], run[-1]["x1"]
                size = max(c["size"] for c in run)
                h = max(LINE_HEIGHT, size * 1.25)
                fields.append({
                    "page": pno, "x": x0, "y": run[0]["bottom"] - h + 1.5,
                    "w": x1 - x0, "h": h, "kind": "line",
                    "label": _label_before(chars, x0), "fs": min(12.0, max(9.0, size)),
                    "underline": False,
                })

        for ch in chars:
            if ch["text"] == "_" and (not run or ch["x0"] - run[-1]["x1"] < 2.0):
                run.append(ch)
            else:
                flush()
                run = [ch] if ch["text"] == "_" else []
        flush()
    return fields


def number_sign_fields(page, pno, existing, table_boxes):
    """'№' belgisidan keyin chiziq bo'lmasa, raqam yozish uchun joy qo'shiladi."""
    fields = []
    for line in _group_lines(page.chars):
        chars = line["chars"]
        for i, ch in enumerate(chars):
            if ch["text"] not in ("№",):
                continue
            nxt = [c for c in chars[i + 1:] if c["text"].strip()]
            if nxt and nxt[0]["x0"] - ch["x1"] < 25:
                continue
            if _in_boxes(ch["x0"], ch["top"], table_boxes):
                continue
            x = ch["x1"] + 2
            rect = (x, ch["top"] - 1, x + 70, ch["bottom"] + 1)
            if any(_overlap(rect, f) for f in existing):
                continue
            fields.append({
                "page": pno, "x": x, "y": ch["top"] - 2, "w": 70, "h": ch["bottom"] - ch["top"] + 4,
                "kind": "line", "label": "№", "fs": min(12.0, ch["size"]), "underline": False,
            })
    return fields


def colon_fields(page, pno, existing, table_boxes):
    """'...:' bilan tugab, o'ng tomoni bo'sh qatorlarga yozish joyi qo'shiladi."""
    fields = []
    right_edge = float(page.width) - 40
    for line in _group_lines(page.chars):
        visible = [c for c in line["chars"] if c["text"].strip()]
        if not visible or visible[-1]["text"] != ":":
            continue
        last = visible[-1]
        if _in_boxes(last["x0"], last["top"], table_boxes):
            continue
        x = last["x1"] + 3
        w = min(right_edge, x + 320) - x
        if w < 60:
            continue
        h = max(LINE_HEIGHT, last["size"] * 1.25)
        rect = (x, last["bottom"] - h + 1.5, x + w, last["bottom"] + 1.5)
        if any(_overlap(rect, f, 0.05) for f in existing if f["page"] == pno):
            continue
        # o'ng tomonda (shu qator balandligida) boshqa matn bo'lmasin
        if any(c["text"].strip() and c["x0"] > x and c["bottom"] > rect[1] + 2 and c["top"] < rect[3] - 2
               for c in page.chars):
            continue
        fields.append({
            "page": pno, "x": x, "y": rect[1], "w": w, "h": h, "kind": "line",
            "label": _label_before(line["chars"], x), "fs": min(12.0, max(9.0, last["size"])),
            "underline": False,
        })
    return fields


def _in_boxes(x, y, boxes, pad=1.0):
    return any(bx0 - pad <= x <= bx1 + pad and by0 - pad <= y <= by1 + pad for bx0, by0, bx1, by1 in boxes)


def _overlap(rect, f, min_ratio=0.3):
    x0, y0, x1, y1 = rect
    fx0, fy0, fx1, fy1 = f["x"], f["y"], f["x"] + f["w"], f["y"] + f["h"]
    ix = max(0, min(x1, fx1) - max(x0, fx0))
    iy = max(0, min(y1, fy1) - max(y0, fy0))
    area = max(1e-6, (x1 - x0) * (y1 - y0))
    return ix * iy / area >= min_ratio


def table_cell_fields(page, pno):
    fields, table_boxes = [], []
    for table in page.find_tables():
        table_boxes.append(table.bbox)
        for cell in table.cells:
            x0, top, x1, bottom = cell
            w, h = x1 - x0, bottom - top
            if w < 12 or h < 8:
                continue
            inside = page.crop((x0 + 0.5, top + 0.5, x1 - 0.5, bottom - 0.5), strict=False)
            if inside.extract_text().strip():
                continue
            fields.append({
                "page": pno, "x": x0 + 1.5, "y": top + 1, "w": w - 3, "h": h - 2,
                "kind": "cell", "label": "", "fs": min(11.0, max(8.0, h - 4)),
                "underline": False,
            })
    return fields, table_boxes


def blank_rule_fields(page, pno, table_boxes):
    """Matn ostida turmagan gorizontal chiziqlar (chop etilgan bo'sh qatorlar)."""
    fields = []
    segments, verticals = [], []
    for obj in list(page.lines) + list(page.rects):
        height = abs(obj["bottom"] - obj["top"])
        width = obj["x1"] - obj["x0"]
        if width <= 1.6 and height > 8:
            verticals.append(((obj["x0"] + obj["x1"]) / 2, obj["top"], obj["bottom"]))
        if obj.get("object_type") == "rect" and width > 40 and height > 8:
            # to'liq ramka (to'rtburchak) — maydon emas
            continue
        if height > 1.6 or width < 40:
            continue
        segments.append((obj["x0"], obj["x1"], (obj["top"] + obj["bottom"]) / 2))

    def touches_vertical(x, y):
        return any(abs(vx - x) < 3 and vt - 3 <= y <= vb + 3 for vx, vt, vb in verticals)

    for x0, x1, y in segments:
        if touches_vertical(x0, y) and touches_vertical(x1, y):
            continue  # ramka yoki jadval chegarasi
        if any(tx0 - 1 <= x0 and x1 <= tx1 + 1 and ty0 - 1 <= y <= ty1 + 1 for tx0, ty0, tx1, ty1 in table_boxes):
            continue
        # chiziq ustidagi matn (tagiga chizilgan so'zlar) egallamagan eng katta bo'sh joy
        above = sorted(
            (max(c["x0"], x0), min(c["x1"], x1)) for c in page.chars
            if c["text"].strip() and y - 14 <= c["bottom"] <= y + 1.5
            and c["x1"] > x0 and c["x0"] < x1
        )
        best, cursor = (0.0, x0, x1), x0
        gaps = []
        for a, b in above:
            if a > cursor:
                gaps.append((a - cursor, cursor, a))
            cursor = max(cursor, b)
        if cursor < x1:
            gaps.append((x1 - cursor, cursor, x1))
        if not gaps:
            continue
        best = max(gaps)
        if best[0] < 40:
            continue
        gx0 = best[1] + (2 if best[1] > x0 else 0)
        fields.append({
            "page": pno, "x": gx0, "y": y - LINE_HEIGHT, "w": best[2] - gx0, "h": LINE_HEIGHT - 0.5,
            "kind": "line", "label": "", "fs": 11.0, "underline": False,
        })
    return fields


def clamp_line_fields(page, fields):
    """Chiziq maydoni yuqoridagi matn yoki boshqa maydon ustiga chiqmasin."""
    glyphs = [c for c in page.chars if c["text"].strip() and c["text"] != "_"]
    result = []
    for f in sorted(fields, key=lambda f: f["y"] + f["h"]):
        if f["kind"] != "line":
            result.append(f)
            continue
        bottom = f["y"] + f["h"]
        top = f["y"]
        for c in glyphs:
            if c["x1"] > f["x"] + 1 and c["x0"] < f["x"] + f["w"] - 1 and top - 0.5 < c["bottom"] < bottom - 4:
                if c["top"] < bottom - 4:
                    top = max(top, c["bottom"])
        for g in result:
            if g["kind"] != "line":
                continue
            gb = g["y"] + g["h"]
            if g["x"] < f["x"] + f["w"] - 1 and f["x"] < g["x"] + g["w"] - 1 and top - 0.5 < gb <= bottom - 1:
                top = max(top, gb)
        if bottom - top < 6:
            continue
        f["h"] = bottom - top
        f["y"] = top
        f["fs"] = min(f["fs"], max(7.0, f["h"] * 0.85))
        result.append(f)
    return result


def grow_right(page, f):
    """Redaksiya qilingan joyni o'ngdagi keyingi matngacha kengaytiradi."""
    cy = f["y"] + f["h"] / 2
    right_limit = min(f["x"] + 260, float(page.width) - 30)
    for c in page.chars:
        if c["text"].strip() and c["top"] <= cy <= c["bottom"] and c["x0"] >= f["x"] + f["w"] - 0.5:
            right_limit = min(right_limit, c["x0"] - 2)
    f["w"] = max(f["w"], right_limit - f["x"])


def merge_line_fields(fields):
    """Bir qatordagi ustma-ust / yonma-yon chiziq maydonlarini birlashtiradi."""
    result = []
    for f in sorted(fields, key=lambda f: (f["page"], round((f["y"] + f["h"]) / 4), f["x"])):
        if result and f["kind"] == "line":
            prev = result[-1]
            same_line = prev["kind"] == "line" and prev["page"] == f["page"] and \
                abs((prev["y"] + prev["h"]) - (f["y"] + f["h"])) < 4
            touching = f["x"] <= prev["x"] + prev["w"] + 3 and prev["x"] <= f["x"] + f["w"] + 3
            if same_line and touching:
                right = max(prev["x"] + prev["w"], f["x"] + f["w"])
                top = min(prev["y"], f["y"])
                bottom = max(prev["y"] + prev["h"], f["y"] + f["h"])
                prev.update(x=min(prev["x"], f["x"]), y=top, h=bottom - top)
                prev["w"] = right - prev["x"]
                prev["label"] = prev["label"] or f["label"]
                continue
        result.append(dict(f))
    return result


def unit_of(field, page_sizes, grid):
    cols, rows = grid
    pw, ph = page_sizes[field["page"]]
    cx, cy = field["x"] + field["w"] / 2, field["y"] + field["h"] / 2
    col = min(cols - 1, int(cx / (pw / cols)))
    row = min(rows - 1, int(cy / (ph / rows)))
    return (field["page"], row, col), (col * pw / cols, row * ph / rows)


def split_by_grid(fields, entry, page_sizes):
    """Bir nechta nusxali sahifada chiziq maydoni bir nusxadan boshqasiga o'tmasin."""
    cols, _rows = entry.get("grid", (1, 1))
    if cols == 1:
        return fields
    result = []
    for f in fields:
        pw = page_sizes[f["page"]][0]
        cuts = [pw * i / cols for i in range(1, cols)]
        pieces = [(f["x"], f["x"] + f["w"])]
        for cut in cuts:
            nxt = []
            for a, b in pieces:
                if a < cut - 5 and b > cut + 5:
                    nxt += [(a, cut - 6), (cut + 6, b)]
                else:
                    nxt.append((a, b))
            pieces = nxt
        for a, b in pieces:
            if b - a >= 20:
                g = dict(f)
                g["x"], g["w"] = a, b - a
                result.append(g)
    return result


def assign_names(fields, entry, page_sizes):
    grid = entry.get("grid", (1, 1))
    mirror = entry.get("mirror", False) or grid != (1, 1)

    units = {}
    for f in fields:
        unit, origin = unit_of(f, page_sizes, grid)
        if not mirror:
            unit, origin = (0, 0, 0), (0, 0)  # nusxa yo'q — hamma maydon alohida
        f["_rx"], f["_ry"] = f["x"] - origin[0], f["y"] - origin[1]
        units.setdefault(unit, []).append(f)

    ordered_units = sorted(units)
    counter = 0
    base = None
    for unit in ordered_units:
        items = sorted(units[unit], key=lambda f: (f["page"], round(f["_ry"] / 4), f["_rx"]))
        if base is None:
            for f in items:
                counter += 1
                f["name"] = f"f{counter}"
            base = items
            continue
        if [f["kind"] for f in items] == [b["kind"] for b in base]:
            # Nusxalar tuzilishi bir xil — tartib raqami bo'yicha moslaymiz
            for f, b in zip(items, base):
                f["name"] = b["name"]
            continue
        used = set()
        for f in items:
            best, best_d = None, 1e9
            for b in base:
                if b["name"] in used or b["kind"] != f["kind"]:
                    continue
                d = abs(b["_rx"] - f["_rx"]) + abs(b["_ry"] - f["_ry"])
                if d < best_d:
                    best, best_d = b, d
            if best is not None and best_d < 45:
                f["name"] = best["name"]
                used.add(best["name"])
            else:
                counter += 1
                f["name"] = f"f{counter}"
    for f in fields:
        f.pop("_rx", None)
        f.pop("_ry", None)


AUTOFILL_RULES = [
    ("client_name", r"(F\.?\s?I\.?\s?SH|FISH|Ф\.?\s?И\.?\s?Ш|ФИШ|Ф\s?\.\s?И\s?\.\s?О|Familiyasi,?\s*ismi|Familiyasi)"),
    ("birth_year", r"(Yoshi|Ёши|Tug.ilgan yili|Туғилган)"),
    ("address", r"(Manzil|Манзил)"),
    ("analysis_name", r"(Analiz nomi|Анализ номи)"),
]


NOT_PATIENT = re.compile(r"(vrach|врач|mudir|мудир|shaxs|шахс|rahbar|раҳбар|рахбар|laborant|лаборант|imzo|имзо)", re.IGNORECASE)


def autofill_key(field):
    label = field.get("label") or ""
    if NOT_PATIENT.search(label):
        return None
    for key, pattern in AUTOFILL_RULES:
        if re.search(pattern + r"\w*[\s:.,]*$", label, flags=re.IGNORECASE):
            return key
    return None


def extract_fields(pdf_path: Path, entry: dict, extra_fields):
    fields = []
    page_sizes = []
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages):
            page_sizes.append((float(page.width), float(page.height)))
            cells, table_boxes = table_cell_fields(page, pno)
            lines = underscore_fields(page, pno)
            rules = blank_rule_fields(page, pno, table_boxes)
            page_fields = cells + merge_line_fields(lines + rules + [f for f in extra_fields if f["page"] == pno])
            page_fields += number_sign_fields(page, pno, page_fields, table_boxes)
            page_fields += colon_fields(page, pno, page_fields, table_boxes)
            page_fields = clamp_line_fields(page, page_fields)
            lines_of_page = _group_lines(page.chars)
            for f in page_fields:
                if f["kind"] == "line" and not f["label"]:
                    base = f["y"] + f["h"]
                    for line in lines_of_page:
                        if abs(line["bottom"] - base) < 5:
                            f["label"] = _label_before(line["chars"], f["x"])
                            break
            for f in page_fields:
                if f.pop("grow", False):
                    grow_right(page, f)
            fields += page_fields

    for f in fields:
        f.pop("underline", None)
        for k in ("x", "y", "w", "h", "fs"):
            f[k] = round(float(f[k]), 1)
        auto = autofill_key(f)
        if auto:
            f["auto"] = auto
    fields = split_by_grid(fields, entry, page_sizes)
    assign_names(fields, entry, page_sizes)
    # Har bir avto-to'ldirish turi faqat birinchi maydonga (nusxalari bilan) qo'yiladi
    owner = {}
    for f in sorted(fields, key=lambda f: (f["page"], f["y"], f["x"])):
        auto = f.get("auto")
        if not auto:
            continue
        owner.setdefault(auto, f["name"])
        if owner[auto] != f["name"]:
            del f["auto"]
    return fields, page_sizes


# --------------------------------------------------------------------------- #
# 4. Sahifa fonini (SVG) yozish
# --------------------------------------------------------------------------- #

def render_pages(pdf_path: Path, key: str, count: int):
    target = OUT_DIR / key
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    names = []
    for i in range(count):
        out = target / f"p{i + 1}.svg"
        subprocess.run(
            ["pdftocairo", "-svg", "-f", str(i + 1), "-l", str(i + 1), str(pdf_path), str(out)],
            check=True,
        )
        names.append(f"{key}/p{i + 1}.svg")
    return names


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"version": 1, "lab_groups": LAB_GROUPS, "templates": []}
    keys = set()
    with tempfile.TemporaryDirectory() as tmp:
        workdir = Path(tmp)
        for entry in BLANKS:
            key = entry["key"]
            if key in keys:
                raise SystemExit(f"Takroriy kalit: {key}")
            keys.add(key)
            prepared = prepare_source(entry, workdir)
            pdf = to_pdf(prepared, workdir)
            selected, extra = select_and_redact(pdf, entry, workdir)
            fields, sizes = extract_fields(selected, entry, extra)
            images = render_pages(selected, key, len(sizes))
            manifest["templates"].append({
                "key": key,
                "title": entry["title"],
                "form": entry.get("form", ""),
                "labs": entry.get("labs", []),
                "source": entry["source"],
                "pages": [{"w": round(w, 1), "h": round(h, 1), "src": src} for (w, h), src in zip(sizes, images)],
                "fields": fields,
            })
            print(f"  {key:28s} {len(sizes)} sahifa, {len(fields):3d} maydon  <- {entry['source']}")

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), "utf-8")
    BACKEND_JSON.write_text(
        json.dumps([{"key": t["key"], "title": t["title"]} for t in manifest["templates"]], ensure_ascii=False, indent=1),
        "utf-8",
    )
    print(f"Tayyor: {len(manifest['templates'])} ta shablon -> {OUT_DIR}")


if __name__ == "__main__":
    main()
