import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Printer, FileText, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatSum, paymentMethodLabel, paymentStatusLabel } from "@/lib/ses";
import { printHtml } from "./printUtils";
import type { AdmissionRow } from "./types";

const clientName = (a: AdmissionRow) =>
  `${a.clients?.last_name ?? ""} ${a.clients?.first_name ?? ""}`.trim();

const groupByLab = (a: AdmissionRow, labName: (id: string | null) => string) => {
  const map = new Map<string, string[]>();
  a.admission_items.forEach((it) => {
    const key = labName(it.laboratory_id);
    map.set(key, [...(map.get(key) ?? []), it.service_name]);
  });
  return Array.from(map.entries());
};

interface Props {
  admission: AdmissionRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  labName: (id: string | null) => string;
}

export const ReferralDialog = ({ admission, open, onOpenChange, labName }: Props) => {
  if (!admission) return null;
  const groups = groupByLab(admission, labName);

  const handlePrint = () => {
    const rows = groups
      .map(
        ([lab, names]) =>
          `<tr><td><b>${lab}</b></td><td>${names.join("<br/>")}</td></tr>`,
      )
      .join("");
    printHtml(
      `Yo'llanma ${admission.order_number}`,
      `<h1>Jizzax viloyat SES markazi — Elektron yo'llanma</h1>
       <p class="muted">Yo'llanma raqami: <b>${admission.order_number}</b></p>
       <div class="box">
         <p><b>Mijoz:</b> ${clientName(admission)}</p>
          <p><b>Mijoz ID:</b> ${admission.client_id}</p>
          <p><b>Telefon:</b> ${admission.clients?.phone ?? "—"}</p>
          <p><b>Ro'yxatga olingan:</b> ${format(new Date(admission.created_at), "dd.MM.yyyy HH:mm")}</p>
          <p><b>Operator:</b> ${admission.operator_name ?? "—"}</p>
          <p><b>To'lov holati:</b> ${paymentStatusLabel(admission.payment_status)}</p>
       </div>
       <h2>Yo'nalish</h2>
       <table><thead><tr><th>Laboratoriya</th><th>Analiz</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Elektron yo'llanma
          </DialogTitle>
          <DialogDescription>{admission.order_number}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-4">
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-foreground text-base">{clientName(admission)}</p>
              <p className="text-muted-foreground">Telefon: {admission.clients?.phone ?? "—"}</p>
              <p className="text-muted-foreground">
                Sana: {format(new Date(admission.created_at), "dd.MM.yyyy HH:mm")}
              </p>
              <p className="text-muted-foreground">Operator: {admission.operator_name ?? "—"}</p>
              <Badge className="bg-primary/10 text-primary border-0 mt-1">
                {paymentStatusLabel(admission.payment_status)}
              </Badge>
            </div>
            <div className="shrink-0 rounded-lg bg-card p-2 border border-border">
              <QRCodeSVG value={admission.order_number} size={96} />
              <p className="text-[10px] text-muted-foreground text-center mt-1">QR kod</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Yo'nalish</p>
            <div className="space-y-3">
              {groups.map(([lab, names]) => (
                <div key={lab} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">Yo'naltirildi</p>
                  <p className="font-display font-bold text-lg text-foreground">{lab}</p>
                  <Separator className="my-2" />
                  <ul className="space-y-1">
                    {names.map((n) => (
                      <li key={n} className="text-sm text-muted-foreground">• {n}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Chop etish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const ReceiptDialog = ({ admission, open, onOpenChange, labName }: Props) => {
  if (!admission) return null;
  const subtotal = admission.admission_items.reduce((s, i) => s + Number(i.price) * i.quantity, 0);
  const remaining = Math.max(0, Number(admission.total_amount) - Number(admission.paid_amount));
  const receiptNo = `CHEK-${admission.order_number.replace("SES-JIZ-", "")}`;

  const handlePrint = () => {
    const rows = admission.admission_items
      .map(
        (i) =>
          `<tr><td>${i.service_name}</td><td>${labName(i.laboratory_id)}</td><td>${i.quantity}</td><td>${formatSum(Number(i.price) * i.quantity)}</td></tr>`,
      )
      .join("");
    printHtml(
      `Chek ${receiptNo}`,
      `<h1>Jizzax viloyat SES markazi — To'lov cheki</h1>
       <p class="muted">Chek raqami: <b>${receiptNo}</b> · Buyurtma: <b>${admission.order_number}</b></p>
       <div class="box">
         <p><b>Mijoz:</b> ${clientName(admission)}</p>
         <p><b>Sana:</b> ${format(new Date(admission.created_at), "dd.MM.yyyy HH:mm")}</p>
         <p><b>Operator:</b> ${admission.operator_name ?? "—"}</p>
         <p><b>To'lov usuli:</b> ${paymentMethodLabel(admission.payment_method)}</p>
       </div>
       <table><thead><tr><th>Xizmat</th><th>Laboratoriya</th><th>Soni</th><th>Summa</th></tr></thead><tbody>${rows}</tbody></table>
       <div class="box">
         <p>Oraliq summa: ${formatSum(subtotal)}</p>
         <p>Chegirma: ${formatSum(admission.discount_amount)}</p>
         <p class="total">Jami: ${formatSum(admission.total_amount)}</p>
         <p>To'langan: ${formatSum(admission.paid_amount)}</p>
         <p>Qoldiq: ${formatSum(remaining)}</p>
         <p>Holat: ${paymentStatusLabel(admission.payment_status)}</p>
       </div>`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            To'lov cheki
          </DialogTitle>
          <DialogDescription>{receiptNo}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mijoz</span>
            <span className="font-medium text-foreground">{clientName(admission)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sana</span>
            <span>{format(new Date(admission.created_at), "dd.MM.yyyy HH:mm")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Operator</span>
            <span>{admission.operator_name ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">To'lov usuli</span>
            <span>{paymentMethodLabel(admission.payment_method)}</span>
          </div>
          <Separator />
          {admission.admission_items.map((i) => (
            <div key={i.id} className="flex justify-between gap-3">
              <span className="text-muted-foreground">{i.service_name} × {i.quantity}</span>
              <span className="whitespace-nowrap">{formatSum(Number(i.price) * i.quantity)}</span>
            </div>
          ))}
          <Separator />
          <div className="flex justify-between"><span className="text-muted-foreground">Oraliq summa</span><span>{formatSum(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Chegirma</span><span>{formatSum(admission.discount_amount)}</span></div>
          <div className="flex justify-between font-display font-bold text-base"><span>Jami</span><span>{formatSum(admission.total_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">To'langan</span><span>{formatSum(admission.paid_amount)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Qoldiq</span><span>{formatSum(remaining)}</span></div>
        </div>

        <DialogFooter>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Chop etish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};