import { useState } from "react";
import { Printer, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { printHtml } from "@/components/qabul/printUtils";

interface Props {
  clientName: string;
  birthYear: string;
  address: string;
}

const line = (label: string, value: string) =>
  `<div class="fld"><span class="lbl">${label}</span><span class="val">${value || "&nbsp;"}</span></div>`;

export const BrutsellozSerologicalBlank = ({ clientName, birthYear, address }: Props) => {
  const [number, setNumber] = useState("");
  const [sana, setSana] = useState("");
  const [tashxis, setTashxis] = useState("");
  const [material, setMaterial] = useState("");
  const [heddelson, setHeddelson] = useState("");
  const [rayt, setRayt] = useState("");
  const [tavsiya, setTavsiya] = useState("");
  const [ajratildi, setAjratildi] = useState("");
  const [antibiotik, setAntibiotik] = useState("");
  const [javobSana, setJavobSana] = useState("");
  const [vrach, setVrach] = useState("");
  const [laborant, setLaborant] = useState("");

  const fields: [string, string][] = [
    ["Ф.И.Ш", clientName],
    ["Ёши", birthYear],
    ["Манзили", address],
    ["Бошланғич ташхис", tashxis],
    ["Материал номи", material],
    ["Хеддельсон", heddelson],
    ["Райт", rayt],
    ["Тавсия", tavsiya],
    ["Ажратилди / ажратилмади", ajratildi],
    ["Антибиотикларга сезувчанлиги", antibiotik],
    ["Жавоб берилган сана", javobSana],
    ["Хулоса берган врач", vrach],
    ["Анализ қўйган лаборант", laborant],
  ];

  const handlePrint = () => {
    printHtml(
      `Зооноз хулосаси №${number}`,
      `<div class="blank">
        <h1 class="ttl">ЗООНОЗ КАСАЛЛИКЛАРГА ТЕКШИРУВ ХУЛОСАСИ</h1>
        <p class="sub">№ ${number || "______"} &nbsp;&nbsp; «____» _____ 2026 й</p>
        ${fields.map(([l, v]) => line(l, v)).join("")}
        <p class="footer">Ўзбекистон Республикаси Соғлиқни Сақлаш вазирлиги ҳузуридаги СЭО ва ЖСК Жиззах вилоят бошқармаси — ЎХЮК лабораторияси<br/>
        Ўзбекистон Республикаси Соғлиқни сақлаш вазирининг 2025 йил 26 декабрдаги 399-сонли буйруғи билан тасдиқланган 291-ҳ/ш-рақамли тиббий ҳужжат шакли</p>
      </div>
      <style>
        .blank { max-width: 700px; margin: 0 auto; }
        .ttl { text-align: center; font-size: 16px; margin-bottom: 4px; }
        .sub { text-align: center; font-size: 12px; margin-bottom: 18px; }
        .fld { display: flex; gap: 8px; align-items: flex-end; margin-bottom: 14px; font-size: 13px; }
        .lbl { white-space: nowrap; font-weight: 600; min-width: 220px; }
        .val { flex: 1; border-bottom: 1px solid #0f172a; min-height: 18px; }
        .footer { font-size: 10px; color: #64748b; margin-top: 24px; }
      </style>`,
    );
  };

  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground flex items-center gap-2">
        <FileSignature className="w-4 h-4 text-primary" /> Зооноз касалликларга текширув хулосаси
      </p>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>№</Label>
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="123" />
        </div>
        <div className="space-y-1">
          <Label>Сана</Label>
          <Input type="date" value={sana} onChange={(e) => setSana(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Жавоб берилган сана</Label>
          <Input type="date" value={javobSana} onChange={(e) => setJavobSana(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Бошланғич ташхис</Label>
          <Input value={tashxis} onChange={(e) => setTashxis(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Материал номи</Label>
          <Input value={material} onChange={(e) => setMaterial(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Хеддельсон</Label>
          <Input value={heddelson} onChange={(e) => setHeddelson(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Райт</Label>
          <Input value={rayt} onChange={(e) => setRayt(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Ажратилди / ажратилмади</Label>
          <Input value={ajratildi} onChange={(e) => setAjratildi(e.target.value)} placeholder="ажратилди / ажратилмади" />
        </div>
        <div className="space-y-1">
          <Label>Антибиотикларга сезувчанлиги</Label>
          <Input value={antibiotik} onChange={(e) => setAntibiotik(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Тавсия</Label>
          <Input value={tavsiya} onChange={(e) => setTavsiya(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Хулоса берган врач</Label>
          <Input value={vrach} onChange={(e) => setVrach(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Анализ қўйган лаборант</Label>
          <Input value={laborant} onChange={(e) => setLaborant(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm">
        <p className="text-center font-display font-bold">ЗООНОЗ КАСАЛЛИКЛАРГА ТЕКШИРУВ ХУЛОСАСИ №{number || "______"}</p>
        {fields.map(([l, v]) => (
          <div key={l} className="flex gap-2 items-end">
            <span className="font-medium whitespace-nowrap">{l}</span>
            <span className="flex-1 border-b border-foreground/40 whitespace-pre-wrap">{v || " "}</span>
          </div>
        ))}
      </div>

      <Button variant="outline" className="gap-2" onClick={handlePrint}>
        <Printer className="w-4 h-4" /> Blankani chop etish
      </Button>
    </div>
  );
};

export default BrutsellozSerologicalBlank;
