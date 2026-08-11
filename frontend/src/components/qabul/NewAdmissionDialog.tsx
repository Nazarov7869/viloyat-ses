import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { UserPlus, Check, Loader2, FlaskConical, Wallet, FileText, ArrowRight, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api, { apiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { GENDERS, PAYMENT_METHODS, VISIT_TYPES, formatSum, type Laboratory, type ServiceRow } from "@/lib/ses";
import type { ClientRow } from "./types";

const STEPS = [
  { key: "mijoz", label: "Mijoz", icon: UserPlus },
  { key: "analiz", label: "Analiz", icon: FlaskConical },
  { key: "tolov", label: "To'lov", icon: Wallet },
  { key: "lab", label: "Laboratoriya", icon: FlaskConical },
  { key: "yollanma", label: "Yo'llanma", icon: FileText },
];

const emptyClient = {
  lastName: "",
  firstName: "",
  phone: "",
  birthDate: "",
  gender: "erkak",
  region: "Jizzax viloyati",
  address: "",
  workplace: "",
  visitType: VISIT_TYPES[0] as string,
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  laboratories: Laboratory[];
  services: ServiceRow[];
  districtId: string | null;
  onSaved: (admissionId: string) => void;
}

const NewAdmissionDialog = ({
  open, onOpenChange, laboratories, services, districtId, onSaved,
}: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(emptyClient);

  const [selected, setSelected] = useState<Record<string, number>>({});
  const [discount, setDiscount] = useState("0");
  const [paid, setPaid] = useState("0");
  const [method, setMethod] = useState<string>("naqd");
  const [createdOrder, setCreatedOrder] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(0);
      setForm(emptyClient);
      setSelected({});
      setDiscount("0");
      setPaid("0");
      setMethod("naqd");
      setCreatedOrder(null);
    }
  }, [open]);

  const labName = (id: string | null) =>
    laboratories.find((l) => l.id === id)?.name ?? "Biriktirilmagan";

  const selectedServices = useMemo(
    () => services.filter((s) => selected[s.id]),
    [services, selected],
  );
  const subtotal = selectedServices.reduce((s, svc) => s + Number(svc.price) * (selected[svc.id] || 1), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));
  const paidNum = Number(paid) || 0;
  const remaining = Math.max(0, total - paidNum);
  const paymentStatus = paidNum <= 0 ? "tolanmagan" : paidNum >= total ? "tolangan" : "qisman";

  const routingGroups = useMemo(() => {
    const map = new Map<string, { lab: string; items: string[] }>();
    selectedServices.forEach((s) => {
      const key = s.laboratory_id ?? "none";
      const entry = map.get(key) ?? { lab: labName(s.laboratory_id), items: [] };
      entry.items.push(s.name);
      map.set(key, entry);
    });
    return Array.from(map.values());
  }, [selectedServices, laboratories]);


  const canNext = () => {
    if (step === 0) return form.lastName.trim() && form.firstName.trim() && form.address.trim() && form.workplace.trim();
    if (step === 1) return selectedServices.length > 0;
    if (step === 2) return true;
    return true;
  };

  const handleFinish = async () => {
    if (!districtId) {
      toast({ title: "Xatolik", description: "Foydalanuvchiga tuman biriktirilmagan.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        client: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          birth_date: form.birthDate || null,
          phone: form.phone.trim() || null,
          gender: form.gender,
          region: form.region,
          address: form.address.trim(),
          workplace: form.workplace.trim() || "—",
          visit_type: form.visitType,
        },
        items: selectedServices.map((s) => ({
          service_id: s.id,
          quantity: selected[s.id] || 1,
        })),
        discount_amount: Number(discount) || 0,
        paid_amount: paidNum,
        payment_method: method,
      };

      // Server computes totals/order number and creates client + admission + items +
      // payment + lab orders in a single atomic transaction.
      const { data: admission } = await api.post("/admissions/", payload);

      setCreatedOrder(admission.order_number);
      setStep(4);
      onSaved(admission.id);
      toast({ title: "Muvaffaqiyatli", description: `Qabul yakunlandi: ${admission.order_number}` });
    } catch (error) {
      logError("Qabulni saqlashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Qabulni saqlashda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceRow[]>();
    services
      .filter((s) => s.is_active && (s.district_id === null || s.district_id === districtId))
      .forEach((s) => {
        const key = labName(s.laboratory_id);
        map.set(key, [...(map.get(key) ?? []), s]);
      });
    return Array.from(map.entries());
  }, [services, laboratories, districtId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Yangi qabul</DialogTitle>
          <DialogDescription>Mijozni ro'yxatga oling, analizni tanlang, to'lovni qabul qiling</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2 shrink-0">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                  i < step ? "bg-success/10 text-success" : i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : <s.icon className="w-3.5 h-3.5" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>

        <Separator />

        {/* 0. Mijoz */}
        {step === 0 && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">Yangi mijoz ma'lumotlari</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Familiya</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ism (F.I.Sh.)</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Telefon raqami</Label>
                <Input value={form.phone} placeholder="+998 90 123 45 67" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tug'ilgan sana</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Jinsi</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Viloyat</Label>
                <Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Tuman/shahar, manzil</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Ish joyi</Label>
                <Input value={form.workplace} onChange={(e) => setForm({ ...form, workplace: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Murojaat turi</Label>
                <Select value={form.visitType} onValueChange={(v) => setForm({ ...form, visitType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VISIT_TYPES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* 1. Analiz */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="max-h-[45vh] overflow-y-auto space-y-4 pr-1">
              {grouped.map(([lab, list]) => (
                <div key={lab}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-2">{lab}</p>
                  <div className="space-y-2">
                    {list.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={!!selected[s.id]}
                          onCheckedChange={(v) =>
                            setSelected((prev) => {
                              const next = { ...prev };
                              if (v) next[s.id] = 1; else delete next[s.id];
                              return next;
                            })
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{s.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {s.service_type} · Namuna: {s.sample_type}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">{formatSum(s.price)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="rounded-xl bg-muted/50 p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tanlangan: {selectedServices.length} ta analiz</span>
              <span className="font-display font-bold text-lg text-foreground">{formatSum(subtotal)}</span>
            </div>
          </div>
        )}

        {/* 2. To'lov */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border divide-y divide-border">
              {selectedServices.map((s) => (
                <div key={s.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{labName(s.laboratory_id)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Input
                      type="number"
                      min={1}
                      className="w-16 h-8"
                      value={selected[s.id]}
                      onChange={(e) => setSelected((p) => ({ ...p, [s.id]: Math.max(1, Number(e.target.value) || 1) }))}
                    />
                    <span className="text-sm font-semibold">{formatSum(Number(s.price) * (selected[s.id] || 1))}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Chegirma (so'm)</Label>
                <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To'langan summa</Label>
                <Input type="number" min={0} value={paid} onChange={(e) => setPaid(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To'lov usuli</Label>
                <Select value={method} onValueChange={setMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Oraliq summa</span><span>{formatSum(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Chegirma</span><span>{formatSum(Number(discount) || 0)}</span></div>
              <div className="flex justify-between font-display font-bold text-base"><span>Jami</span><span>{formatSum(total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To'langan</span><span>{formatSum(paidNum)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Qoldiq</span><span>{formatSum(remaining)}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">To'lov holati</span>
                <Badge className={cn("border-0",
                  paymentStatus === "tolangan" ? "bg-success/10 text-success" :
                  paymentStatus === "qisman" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive")}>
                  {paymentStatus === "tolangan" ? "To'langan" : paymentStatus === "qisman" ? "Qisman to'langan" : "To'lanmagan"}
                </Badge>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setPaid(String(total))}>
              To'lovni tasdiqlash (to'liq summa)
            </Button>
          </div>
        )}

        {/* 3. Laboratoriya */}
        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Tanlangan analizlar quyidagi laboratoriyalarga yo'naltiriladi:</p>
            {routingGroups.map((g) => (
              <div key={g.lab} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <p className="font-display font-bold text-foreground">{g.lab}</p>
                <ul className="mt-1 space-y-1">
                  {g.items.map((i) => <li key={i} className="text-sm text-muted-foreground">• {i}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* 4. Yo'llanma */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <p className="text-sm font-semibold text-success flex items-center gap-2">
                <Check className="w-4 h-4" /> Qabul yakunlandi
              </p>
              <p className="font-display font-bold text-lg text-foreground mt-1">{createdOrder}</p>
              <p className="text-sm text-muted-foreground">Mijoz quyidagi laboratoriyalarga yo'naltirildi</p>
            </div>
            {routingGroups.map((g) => (
              <div key={g.lab} className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Yo'naltirildi</p>
                <p className="font-display font-bold text-foreground">{g.lab}</p>
                <ul className="mt-1 space-y-1">
                  {g.items.map((i) => <li key={i} className="text-sm text-muted-foreground">• {i}</li>)}
                </ul>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Yo'llanma va chekni jadvaldagi «Amal» ustunidan chop etishingiz mumkin.
            </p>
          </div>
        )}

        <Separator />

        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
            disabled={saving || step === 4}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> {step === 0 ? "Bekor qilish" : "Orqaga"}
          </Button>

          {step < 3 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()} className="gap-2">
              Keyingisi <ArrowRight className="w-4 h-4" />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleFinish} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Qabulni yakunlash
            </Button>
          )}
          {step === 4 && (
            <Button onClick={() => onOpenChange(false)}>Yopish</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewAdmissionDialog;

export const formatDateTime = (v: string) => format(new Date(v), "dd.MM.yyyy HH:mm");