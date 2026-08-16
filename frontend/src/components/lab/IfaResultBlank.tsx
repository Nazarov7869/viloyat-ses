import { useState } from "react";
import { Printer, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { printHtml } from "@/components/qabul/printUtils";

export interface IfaMarker {
  label: string;
  norm?: string;
}

interface Props {
  title: string;
  formNumber: string;
  markers: IfaMarker[];
  clientName: string;
  birthYear: string;
  address: string;
}

const cell = (v: string) => v || "&nbsp;";

export const IfaResultBlank = ({ title, formNumber, markers, clientName, birthYear, address }: Props) => {
  const [number, setNumber] = useState("");
  const [tekshiruvSana, setTekshiruvSana] = useState("");
  const [hulosaSana, setHulosaSana] = useState("");
  const [vrach, setVrach] = useState("");
  const [results, setResults] = useState<Record<number, { natija: string; hulosa: string }>>({});

  const setResult = (i: number, field: "natija" | "hulosa", value: string) =>
    setResults((prev) => ({ ...prev, [i]: { natija: prev[i]?.natija ?? "", hulosa: prev[i]?.hulosa ?? "", [field]: value } }));

  const handlePrint = () => {
    const rows = markers
      .map(
        (m, i) => `<tr>
          <td>${i + 1}</td>
          <td>${m.label}</td>
          <td>${cell(m.norm ?? "")}</td>
          <td>${cell(results[i]?.natija ?? "")}</td>
          <td>${cell(results[i]?.hulosa ?? "")}</td>
        </tr>`,
      )
      .join("");

    printHtml(
      `${title} №${number}`,
      `<div class="blank">
        <div class="hdr">
          <div>Oʻzbekiston Respublikasi<br/>Sogʻliqni saqlash vazirligi<br/>Jizzax viloyat SEO va JSB<br/>OʻXYuK laboratoriyasi</div>
          <div class="right">Oʻzbekiston Respublikasi<br/>Sogʻliqni saqlash vazirining<br/>2025 yil 26-dekabrdagi 399-sonli<br/>Buyrugʻi bilan tasdiqlangan<br/>${formNumber}-raqamli tibbiy hujjat shakli</div>
        </div>
        <h2 class="ttl">${title}</h2>
        ${["№", number].join(" ")}
        <div class="fld"><span class="lbl">F.I.Sh.</span><span class="val">${cell(clientName)}</span></div>
        <div class="fld"><span class="lbl">Yoshi</span><span class="val">${cell(birthYear)}</span></div>
        <div class="fld"><span class="lbl">Manzili</span><span class="val">${cell(address)}</span></div>
        <div class="fld"><span class="lbl">Tekshiruv sanasi</span><span class="val">${cell(tekshiruvSana)}</span></div>
        <table>
          <thead><tr><th>№</th><th>Oʻlchamlari</th><th>Norma</th><th>Natija</th><th>Hulosa</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="fld"><span class="lbl">Hulosa bergan sana</span><span class="val">${cell(hulosaSana)}</span></div>
        <div class="fld"><span class="lbl">Hulosa bergan vrach</span><span class="val">${cell(vrach)}</span></div>
      </div>
      <style>
        .blank { max-width: 700px; margin: 0 auto; }
        .hdr { display: flex; justify-content: space-between; gap: 16px; font-size: 11px; margin-bottom: 12px; }
        .hdr .right { text-align: right; }
        .ttl { text-align: center; font-size: 16px; margin: 12px 0 16px; }
        .fld { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 10px; font-size: 13px; }
        .lbl { white-space: nowrap; font-weight: 600; }
        .val { flex: 1; border-bottom: 1px solid #0f172a; min-height: 18px; }
      </style>`,
    );
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileSignature className="w-4 h-4 text-primary" /> {title}
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>№</Label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123" />
        </div>
        <div className="space-y-1">
          <Label>Tekshiruv sanasi</Label>
          <Input type="date" value={tekshiruvSana} onChange={(e) => setTekshiruvSana(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Hulosa bergan sana</Label>
          <Input type="date" value={hulosaSana} onChange={(e) => setHulosaSana(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Jizzax viloyat SEO va JSB<br />OʻXYuK laboratoriyasi</span>
          <span className="text-right">{formNumber}-raqamli tibbiy hujjat shakli<br />(399-sonli buyruq, 2025)</span>
        </div>
        <p className="text-center font-display font-bold">{title}</p>
        {([
          ["F.I.Sh.", clientName],
          ["Yoshi", birthYear],
          ["Manzili", address],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex gap-2 items-end">
            <span className="font-medium whitespace-nowrap">{l}</span>
            <span className="flex-1 border-b border-foreground/40 whitespace-pre-wrap">{v || " "}</span>
          </div>
        ))}

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border border-border p-1">№</th>
                <th className="border border-border p-1 text-left">Oʻlchamlari</th>
                <th className="border border-border p-1">Norma</th>
                <th className="border border-border p-1">Natija</th>
                <th className="border border-border p-1">Hulosa</th>
              </tr>
            </thead>
            <tbody>
              {markers.map((m, i) => (
                <tr key={m.label}>
                  <td className="border border-border p-1 text-center">{i + 1}</td>
                  <td className="border border-border p-1">{m.label}</td>
                  <td className="border border-border p-1 text-center">{m.norm ?? ""}</td>
                  <td className="border border-border p-1">
                    <Input
                      className="h-7 text-xs"
                      value={results[i]?.natija ?? ""}
                      onChange={(e) => setResult(i, "natija", e.target.value)}
                    />
                  </td>
                  <td className="border border-border p-1">
                    <Input
                      className="h-7 text-xs"
                      value={results[i]?.hulosa ?? ""}
                      onChange={(e) => setResult(i, "hulosa", e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-2 items-end">
          <span className="font-medium whitespace-nowrap">Hulosa bergan vrach</span>
          <Input className="h-7 text-xs max-w-xs" value={vrach} onChange={(e) => setVrach(e.target.value)} placeholder="F.I.Sh." />
        </div>
      </div>

      <Button variant="outline" className="gap-2" onClick={handlePrint}>
        <Printer className="w-4 h-4" /> Blankani chop etish
      </Button>
    </div>
  );
};

export default IfaResultBlank;
