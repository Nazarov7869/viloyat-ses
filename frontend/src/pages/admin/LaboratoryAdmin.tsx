import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import { Loader2, Search, FlaskConical } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api, { apiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";

import { cn } from "@/lib/utils";
import { LAB_STATUSES, formatSum, labStatusLabel, paymentStatusLabel } from "@/lib/ses";
import { LabConclusionPanel } from "@/components/lab/LabConclusionPanel";
import { loadBlankManifest, applyAutofill, type AutofillSource, type BlankValues } from "@/lib/blanks";

const POLL_INTERVAL_MS = 20000;

interface LabOrderFull {
  id: string;
  service_name: string;
  sample_type: string | null;
  status: string;
  result_text: string | null;
  approved_by: string | null;
  operator_name: string | null;
  /** Buyurtmaning o'zida saqlangan blanka (bo'sh bo'lsa — xizmatning standart blankasi) */
  conclusion_template: string;
  conclusion_data: BlankValues | null;
  conclusion_updated_at: string | null;
  default_conclusion_template: string;
  created_at: string;
  client_id: string;
  clients: { first_name: string; last_name: string; phone: string | null; pinfl: string | null; address: string; birth_year: string | null } | null;
  admissions: { order_number: string; payment_status: string } | null;
  /** Shu analizning o'z narxi (qabul vaqtidagi) */
  item: { price: string; quantity: number; amount: string } | null;
}

const itemPriceLabel = (item: LabOrderFull["item"]) => {
  if (!item) return "—";
  return item.quantity > 1
    ? `${formatSum(Number(item.amount))} (${item.quantity} × ${formatSum(Number(item.price))})`
    : formatSum(Number(item.amount));
};

const LaboratoryAdmin = () => {
  const { code } = useParams();
  const { toast } = useToast();
  const [labName, setLabName] = useState("Laboratoriya");
  const [labId, setLabId] = useState<string | null>(null);
  const [labCode, setLabCode] = useState<string | null>(null);
  const [orders, setOrders] = useState<LabOrderFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [active, setActive] = useState<LabOrderFull | null>(null);
  const [resultText, setResultText] = useState("");
  const [blankKey, setBlankKey] = useState("");
  const [blankValues, setBlankValues] = useState<BlankValues>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAll = async (labIdentifier?: string) => {
    try {
      let id = labIdentifier ?? labId;
      if (!id) {
        const { data: labs } = await api.get<{ id: string; name: string; code: string }[]>("/laboratories/", {
          params: { code: code ?? "" },
        });
        const lab = labs?.[0];
        if (!lab) {
          setLoading(false);
          return;
        }
        id = lab.id;
        setLabId(lab.id);
        setLabName(lab.name);
        setLabCode(lab.code);
      }

      const { data } = await api.get<LabOrderFull[]>("/lab-orders/", { params: { laboratory: id } });
      setOrders(data ?? []);
    } catch (error) {
      logError("Laboratoriya buyurtmalarini yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setLabId(null);
    setLabCode(null);
    setOrders([]);
    fetchAll();

    const interval = setInterval(() => fetchAll(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        !term ||
        `${o.clients?.last_name ?? ""} ${o.clients?.first_name ?? ""}`.toLowerCase().includes(term) ||
        (o.clients?.phone ?? "").toLowerCase().includes(term) ||
        (o.clients?.pinfl ?? "").toLowerCase().includes(term) ||
        (o.admissions?.order_number ?? "").toLowerCase().includes(term) ||
        o.service_name.toLowerCase().includes(term);
      const matchStatus = statusFilter === "all" || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const autofillFor = (o: LabOrderFull): AutofillSource => ({
    client_name: `${o.clients?.last_name ?? ""} ${o.clients?.first_name ?? ""}`.trim(),
    birth_year: o.clients?.birth_year ?? "",
    address: o.clients?.address ?? "",
    analysis_name: o.service_name,
  });

  const openOrder = async (o: LabOrderFull) => {
    // Xulosa avval saqlangan bo'lsa — o'sha blanka (umumiy blanka ham, kaliti bo'sh),
    // aks holda xizmat uchun belgilangan standart blanka.
    const key = o.conclusion_updated_at ? o.conclusion_template ?? "" : o.default_conclusion_template || "";
    const saved = o.conclusion_data ?? {};
    setActive(o);
    setResultText(o.result_text ?? "");
    setBlankKey(key);
    setBlankValues(saved);
    setDirty(false);
    // Hali hech narsa yozilmagan bo'lsa — bemor ma'lumotlarini blankaga qo'yamiz
    if (key && Object.keys(saved).length === 0) {
      try {
        const manifest = await loadBlankManifest();
        const template = manifest.templates.find((t) => t.key === key);
        if (template) {
          setBlankValues((current) =>
            Object.keys(current).length === 0 ? applyAutofill(template, {}, autofillFor(o)) : current,
          );
        }
      } catch (error) {
        logError("Blanka shablonlarini yuklashda xatolik:", error);
      }
    }
  };

  const closeOrder = () => {
    if (dirty && !window.confirm("Saqlanmagan o'zgarishlar bor. Oynani yopasizmi?")) return;
    setActive(null);
    setDirty(false);
  };

  const patchOrder = async (id: string, payload: Record<string, unknown>, successText: string) => {
    setSaving(true);
    try {
      const { data } = await api.patch<LabOrderFull>(`/lab-orders/${id}/`, payload);
      toast({ title: "Saqlandi", description: successText });
      setActive((prev) => (prev && prev.id === id ? { ...prev, ...data } : prev));
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...data } : o)));
      return true;
    } catch (error) {
      logError("Buyurtmani saqlashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Saqlashda xatolik yuz berdi"), variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await patchOrder(id, { status }, `Holat: ${labStatusLabel(status)}`);
  };

  const saveConclusion = async (markReady: boolean) => {
    if (!active) return;
    const payload: Record<string, unknown> = {
      result_text: resultText,
      conclusion_template: blankKey,
      conclusion_data: blankValues,
    };
    if (markReady) {
      payload.status = "natija_tayyor";
      payload.result_at = new Date().toISOString();
    }
    const ok = await patchOrder(
      active.id,
      payload,
      markReady ? "Natija va xulosa saqlandi, holat: natija tayyor" : "Xulosa blankasi saqlandi",
    );
    if (ok) setDirty(false);
  };

  const statusBadge = (s: string) => (
    <Badge className={cn("border-0",
      s === "yakunlandi" || s === "natija_tasdiqlandi" ? "bg-success/10 text-success" :
      s === "jarayonda" || s === "namuna_qabul" ? "bg-warning/10 text-warning" :
      s === "natija_tayyor" ? "bg-info/10 text-info" : "bg-muted text-muted-foreground")}>
      {labStatusLabel(s)}
    </Badge>
  );

  return (
    <AdminLayout title={labName} subtitle="Laboratoriya ish navbati">
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Jami buyurtmalar", value: orders.length },
            { label: "Yangi", value: orders.filter((o) => o.status === "yangi").length },
            { label: "Jarayonda", value: orders.filter((o) => ["mijoz_keldi", "namuna_qabul", "jarayonda"].includes(o.status)).length },
            { label: "Tayyor natijalar", value: orders.filter((o) => ["natija_tayyor", "natija_tasdiqlandi", "yakunlandi"].includes(o.status)).length },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FlaskConical className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle className="font-display">Navbat</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Mijoz, analiz yoki yo'llanma raqami" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="Holat" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha holatlar</SelectItem>
                  {["yangi", "mijoz_keldi", "namuna_qabul", "natija_tayyor"].map((statusValue) => {
                    const s = LAB_STATUSES.find((x) => x.value === statusValue)!;
                    return <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Buyurtmalar yo'q</p>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="text-left">
                      <th className="p-3 font-medium">Mijoz</th>
                      <th className="p-3 font-medium">Analiz</th>
                      <th className="p-3 font-medium">Namuna</th>
                      <th className="p-3 font-medium">Qabul vaqti</th>
                      <th className="p-3 font-medium">Narxi</th>
                      <th className="p-3 font-medium">To'lov</th>
                      <th className="p-3 font-medium">Holat</th>
                      <th className="p-3 font-medium text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((o) => (
                      <tr key={o.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 whitespace-nowrap font-medium text-foreground">{o.clients?.last_name} {o.clients?.first_name}</td>
                        <td className="p-3 max-w-[220px]"><span className="line-clamp-2 text-muted-foreground">{o.service_name}</span></td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground">{o.sample_type ?? "—"}</td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground">{format(new Date(o.created_at), "dd.MM.yyyy HH:mm")}</td>
                        <td className="p-3 whitespace-nowrap">{itemPriceLabel(o.item)}</td>
                        <td className="p-3 whitespace-nowrap">{paymentStatusLabel(o.admissions?.payment_status ?? "tolanmagan")}</td>
                        <td className="p-3 whitespace-nowrap">{statusBadge(o.status)}</td>
                        <td className="p-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => openOrder(o)}>
                            Ochish
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!active} onOpenChange={(v) => !v && closeOrder()}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Ish buyurtmasi</DialogTitle>
            <DialogDescription>{active?.admissions?.order_number}</DialogDescription>
          </DialogHeader>
          {active && (
            <div className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-2">
                <p><span className="text-muted-foreground">Mijoz: </span>{active.clients?.last_name} {active.clients?.first_name}</p>
                <p><span className="text-muted-foreground">Telefon: </span>{active.clients?.phone ?? "—"}</p>
                <p><span className="text-muted-foreground">Analiz: </span>{active.service_name}</p>
                <p><span className="text-muted-foreground">Namuna turi: </span>{active.sample_type ?? "—"}</p>
                <p><span className="text-muted-foreground">Ro'yxat vaqti: </span>{format(new Date(active.created_at), "dd.MM.yyyy HH:mm")}</p>
                <p><span className="text-muted-foreground">Analiz narxi: </span>{itemPriceLabel(active.item)}</p>
                <p><span className="text-muted-foreground">To'lov holati: </span>{paymentStatusLabel(active.admissions?.payment_status ?? "")}</p>
                <p><span className="text-muted-foreground">Laboratoriya: </span>{labName}</p>
                <p><span className="text-muted-foreground">Operator: </span>{active.operator_name ?? "—"}</p>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label>Joriy holat</Label>
                <div className="flex flex-wrap gap-2">
                  {["yangi", "mijoz_keldi", "namuna_qabul", "natija_tayyor"].map((statusValue) => {
                    const s = LAB_STATUSES.find((x) => x.value === statusValue)!;
                    return (
                      <Button
                        key={s.value}
                        size="sm"
                        variant={active.status === s.value ? "default" : "outline"}
                        disabled={saving}
                        onClick={() => updateStatus(active.id, s.value)}
                      >
                        {s.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Analiz natijasi</Label>
                <Textarea rows={3} value={resultText} onChange={(e) => { setResultText(e.target.value); setDirty(true); }} placeholder="Natijani qisqacha kiriting (xabarnomalar va umumiy blanka uchun)" />
              </div>

              <LabConclusionPanel
                key={active.id}
                lab={{ name: labName, code: labCode }}
                templateKey={blankKey}
                values={blankValues}
                autofill={autofillFor(active)}
                resultText={resultText}
                onTemplateChange={(key, values) => { setBlankKey(key); setBlankValues(values); setDirty(true); }}
                onValuesChange={(values) => { setBlankValues(values); setDirty(true); }}
              />
              {active.conclusion_updated_at && (
                <p className="text-xs text-muted-foreground">
                  Xulosa oxirgi marta saqlangan: {format(new Date(active.conclusion_updated_at), "dd.MM.yyyy HH:mm")}
                </p>
              )}
            </div>
          )}
          <DialogFooter className="gap-2 sm:items-center">
            {dirty && <span className="mr-auto text-xs text-warning">Saqlanmagan o'zgarishlar bor</span>}
            <Button variant="outline" disabled={saving || !active} onClick={() => saveConclusion(false)}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Saqlash
            </Button>
            <Button disabled={saving || !active} onClick={() => saveConclusion(true)}>
              Natija tayyor — saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default LaboratoryAdmin;

export const __labStatuses = LAB_STATUSES;