import { useMemo } from "react";
import { format } from "date-fns";
import { Printer, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { printHtml } from "@/components/qabul/printUtils";

interface Props {
  labName: string;
  clientName: string;
  birthYear: string;
  address: string;
  analysisName: string;
  conclusion: string;
  /** Saqlanadigan qiymatlar: number, doctor, date */
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const line = (label: string, value: string) =>
  `<div class="fld"><span class="lbl">${label}</span><span class="val">${value ? escapeHtml(value).replace(/\n/g, "<br/>") : "&nbsp;"}</span></div>`;

export const ConclusionBlank = ({ labName, clientName, birthYear, address, analysisName, conclusion, values, onChange }: Props) => {
  const number = values.number ?? "";
  const doctor = values.doctor ?? "";
  const date = values.date ?? format(new Date(), "yyyy-MM-dd");
  const setNumber = (v: string) => onChange("number", v);
  const setDoctor = (v: string) => onChange("doctor", v);
  const setDate = (v: string) => onChange("date", v);

  const dateLabel = useMemo(() => {
    try {
      return format(new Date(date), "dd.MM.yyyy");
    } catch {
      return date;
    }
  }, [date]);

  const handlePrint = () => {
    printHtml(
      `Xulosa ${escapeHtml(number)}`,
      `<div class="blank">
        <h1 class="ttl">Jizzax viloyat SES markazi<br/>${escapeHtml(labName)}</h1>
        <h2 class="ttl2">Xulosa №${number ? escapeHtml(number) : "______"}</h2>
        ${line("1. F.I.Sh.", clientName)}
        ${line("2. Tug'ilgan yili", birthYear)}
        ${line("3. Yashash manzili", address)}
        ${line("4. Analiz nomi", analysisName)}
        ${line("5. Laboratoriya xulosasi", conclusion || "")}
        ${line("6. Imzo va muhr", doctor)}
        <p class="sub">(vrach F.I.Sh.)</p>
        ${line("7. Xulosa berilgan sana", dateLabel)}
      </div>
      <style>
        .blank { max-width: 700px; margin: 0 auto; }
        .ttl { text-align: center; font-size: 18px; line-height: 1.4; margin-bottom: 18px; }
        .ttl2 { text-align: center; font-size: 16px; margin: 18px 0 24px; }
        .fld { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 18px; font-size: 14px; }
        .lbl { white-space: nowrap; font-weight: 600; }
        .val { flex: 1; border-bottom: 1px solid #0f172a; min-height: 20px; }
        .sub { font-size: 12px; margin: -12px 0 18px; }
      </style>`,
    );
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileSignature className="w-4 h-4 text-primary" /> Xulosa blankasi
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Xulosa №</Label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123" />
        </div>
        <div className="space-y-1">
          <Label>Vrach F.I.Sh.</Label>
          <Input value={doctor} onChange={(e) => setDoctor(e.target.value)} placeholder="Familiya Ism" />
        </div>
        <div className="space-y-1">
          <Label>Xulosa berilgan sana</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3 text-sm">
        <p className="text-center font-display font-bold">Jizzax viloyat SES markazi — {labName}</p>
        <p className="text-center font-semibold">Xulosa №{number || "______"}</p>
        {([
          ["1. F.I.Sh.", clientName],
          ["2. Tug'ilgan yili", birthYear],
          ["3. Yashash manzili", address],
          ["4. Analiz nomi", analysisName],
          ["5. Laboratoriya xulosasi", conclusion],
          ["6. Imzo va muhr", doctor],
          ["7. Xulosa berilgan sana", dateLabel],
        ] as [string, string][]).map(([l, v]) => (
          <div key={l} className="flex gap-2 items-end">
            <span className="font-medium whitespace-nowrap">{l}</span>
            <span className="flex-1 border-b border-foreground/40 whitespace-pre-wrap">{v || "\u00A0"}</span>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">(vrach F.I.Sh.)</p>
      </div>

      <Button variant="outline" className="gap-2" onClick={handlePrint}>
        <Printer className="w-4 h-4" /> Blankani chop etish
      </Button>
    </div>
  );
};

export default ConclusionBlank;
