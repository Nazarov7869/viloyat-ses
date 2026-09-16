import { useEffect, useState } from "react";

/**
 * Laboratoriya xulosa blankalari ("egizak" blankalar).
 *
 * Shablonlar `hujjattlar/` papkasidagi asl Word/Excel fayllaridan
 * `tools/blanks/build_blanks.py` orqali yasaladi va `public/blanks/` da turadi:
 * har bir sahifa asl ko'rinishdagi SVG + ustiga qo'yiladigan maydonlar.
 */

export type BlankFieldKind = "line" | "cell";
export type AutofillKey = "client_name" | "birth_year" | "address" | "analysis_name";

export interface BlankField {
  name: string;
  page: number;
  x: number; // pt
  y: number; // pt
  w: number; // pt
  h: number; // pt
  fs: number; // shrift o'lchami, pt
  kind: BlankFieldKind;
  label: string;
  auto?: AutofillKey;
}

export interface BlankPage {
  w: number;
  h: number;
  src: string;
  /** Sahifadagi matn/chiziqlar egallagan joy [x0, y0, x1, y1], pt */
  box?: [number, number, number, number];
}

export interface BlankTemplate {
  key: string;
  title: string;
  form: string;
  labs: string[];
  source: string;
  pages: BlankPage[];
  fields: BlankField[];
}

export interface LabGroup {
  codes: string[];
  keywords: string[];
}

export interface BlankManifest {
  version: number;
  lab_groups: Record<string, LabGroup>;
  templates: BlankTemplate[];
}

export type BlankValues = Record<string, string>;

/** Umumiy (oddiy) xulosa blankasi — shablon kaliti bo'sh satr. */
export const GENERIC_TEMPLATE_KEY = "";
export const GENERIC_TEMPLATE_TITLE = "Umumiy (standart) xulosa blankasi";

export const BLANKS_BASE = `${import.meta.env.BASE_URL ?? "/"}blanks/`;

export const blankAssetUrl = (src: string) => new URL(`${BLANKS_BASE}${src}`, window.location.origin).toString();

let manifestPromise: Promise<BlankManifest> | null = null;

export const loadBlankManifest = (): Promise<BlankManifest> => {
  if (!manifestPromise) {
    manifestPromise = fetch(`${BLANKS_BASE}manifest.json`, { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(`manifest.json: ${res.status}`);
        return res.json() as Promise<BlankManifest>;
      })
      .catch((error) => {
        manifestPromise = null; // keyingi urinishda qayta yuklansin
        throw error;
      });
  }
  return manifestPromise;
};

export const useBlankManifest = () => {
  const [manifest, setManifest] = useState<BlankManifest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadBlankManifest()
      .then((m) => active && setManifest(m))
      .catch(() => active && setError("Blanka shablonlarini yuklab bo'lmadi"));
    return () => {
      active = false;
    };
  }, []);

  return { manifest, error, loading: !manifest && !error };
};

/** Laboratoriya nomi/kodi bo'yicha unga tegishli guruh kalitlari. */
export const labGroupsFor = (manifest: BlankManifest, lab: { name?: string | null; code?: string | null }): string[] => {
  const name = (lab.name ?? "").toLowerCase().replace(/[ʻʼ‘’`]/g, "'");
  const code = (lab.code ?? "").toUpperCase();
  return Object.entries(manifest.lab_groups)
    .filter(([, g]) => g.codes.includes(code) || g.keywords.some((k) => name.includes(k.replace(/[ʻʼ‘’`]/g, "'"))))
    .map(([key]) => key);
};

export const templatesForLab = (manifest: BlankManifest, lab: { name?: string | null; code?: string | null }) => {
  const groups = labGroupsFor(manifest, lab);
  const recommended = manifest.templates.filter((t) => t.labs.some((g) => groups.includes(g)));
  const others = manifest.templates.filter((t) => !recommended.includes(t));
  return { recommended, others };
};

export const templateTitle = (manifest: BlankManifest | null, key: string) => {
  if (!key) return GENERIC_TEMPLATE_TITLE;
  const t = manifest?.templates.find((x) => x.key === key);
  return t ? `${t.form ? `${t.form} — ` : ""}${t.title}` : key;
};

export interface AutofillSource {
  client_name: string;
  birth_year: string;
  address: string;
  analysis_name: string;
}

/** Bemor ma'lumotlarini bo'sh maydonlarga qo'yadi (to'ldirilganlariga tegmaydi). */
export const applyAutofill = (template: BlankTemplate, values: BlankValues, source: AutofillSource): BlankValues => {
  const next = { ...values };
  for (const f of template.fields) {
    if (!f.auto || next[f.name]) continue;
    const value = source[f.auto]?.trim();
    // Nusxalardagi maydonlar bir xil nomga ega — qiymat hammasida birdaniga chiqadi.
    if (value) next[f.name] = value;
  }
  return next;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const FIELD_FONT = `"Times New Roman", "Liberation Serif", Times, serif`;

export const isLandscape = (template: BlankTemplate) => template.pages.every((p) => p.w > p.h);

export interface PrintOptions {
  /**
   * Albom (landscape) blankani A4 kitob varag'iga 2 nusxa qilib chiqarish —
   * qog'ozdagi blankalar shunday bosiladi (yuqori va pastki nusxa).
   */
  twoUp?: boolean;
}

const A4_W = 595.3;
const A4_H = 841.9;

/** Blankani asl ko'rinishida (sahifa o'lchamida) chop etish. */
export const printBlank = (template: BlankTemplate, values: BlankValues, title = template.title, options: PrintOptions = {}) => {
  const twoUp = !!options.twoUp && isLandscape(template);
  const size = twoUp ? { w: A4_W, h: A4_H } : template.pages[0];
  const renderPage = (page: BlankPage, index: number) => {
    const fields = template.fields
      .filter((f) => f.page === index && values[f.name])
      .map(
        (f) =>
          `<div class="fld ${f.kind}" style="left:${f.x}pt;top:${f.y}pt;width:${f.w}pt;height:${f.h}pt;font-size:${f.fs}pt">${escapeHtml(values[f.name])}</div>`,
      )
      .join("");
    return `<img src="${blankAssetUrl(page.src)}" alt="" />${fields}`;
  };
  const pages = template.pages
    .map((page, index) => {
      if (!twoUp) {
        return `<section class="page" style="width:${page.w}pt;height:${page.h}pt">${renderPage(page, index)}</section>`;
      }
      // Bo'sh chetlarni kesib, nusxani yarim varaqqa (chetdan 28pt qoldirib) sig'diramiz
      const [bx0, by0, bx1, by1] = page.box ?? [0, 0, page.w, page.h];
      const margin = 28;
      const scale = Math.min((A4_W - 2 * margin) / (bx1 - bx0), (A4_H / 2 - 2 * margin) / (by1 - by0));
      const copy = (top: number) => {
        const left = (A4_W - (bx1 - bx0) * scale) / 2 - bx0 * scale;
        const offsetTop = top + margin - by0 * scale;
        return `<div class="copy" style="top:${offsetTop}pt;left:${left}pt;width:${page.w}pt;height:${page.h}pt;transform:scale(${scale})">${renderPage(page, index)}</div>`;
      };
      return `<section class="page" style="width:${A4_W}pt;height:${A4_H}pt">${copy(0)}${copy(A4_H / 2)}<div class="cut"></div></section>`;
    })
    .join("");

  const html = `<!doctype html><html lang="uz"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
<style>
  @page { size: ${size.w}pt ${size.h}pt; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  .page { position: relative; overflow: hidden; background: #fff; page-break-after: always; break-after: page; }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .page > img, .copy > img { position: absolute; inset: 0; width: 100%; height: 100%; }
  .copy { position: absolute; transform-origin: top left; }
  .cut { position: absolute; left: 0; right: 0; top: ${A4_H / 2}pt; border-top: 0.5pt dashed #bbb; }
  .fld { position: absolute; font-family: ${FIELD_FONT}; color: #000; line-height: 1.05; overflow: hidden; }
  .fld.line { white-space: nowrap; display: flex; align-items: flex-end; padding: 0 2pt 1pt; }
  .fld.cell { white-space: pre-wrap; word-break: break-word; padding: 1pt 2pt; display: flex; align-items: center; justify-content: center; text-align: center; }
</style></head><body>${pages}
<script>
  function fit() {
    document.querySelectorAll('.fld').forEach(function (el) {
      var fs = parseFloat(el.style.fontSize);
      while ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) && fs > 5) {
        fs -= 0.5; el.style.fontSize = fs + 'pt';
      }
    });
  }
  var imgs = Array.prototype.slice.call(document.images);
  Promise.all(imgs.map(function (img) {
    return img.complete ? Promise.resolve() : new Promise(function (r) { img.onload = img.onerror = r; });
  })).then(function () { fit(); setTimeout(function () { window.focus(); window.print(); }, 100); });
</script></body></html>`;

  const frame = document.createElement("iframe");
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  // Chop etish oynasi yopilgach iframe tozalanadi
  frame.contentWindow?.addEventListener("afterprint", () => setTimeout(() => frame.remove(), 500));
  setTimeout(() => frame.isConnected && frame.remove(), 5 * 60 * 1000);
};
