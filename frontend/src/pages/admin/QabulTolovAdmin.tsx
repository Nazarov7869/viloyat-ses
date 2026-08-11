import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Plus, Loader2, Receipt, Eye, Wallet, Users, CheckCircle2, FlaskConical, Pencil,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import api, { apiErrorMessage } from "@/lib/api";
import { fetchMe } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { useUserContext } from "@/hooks/useUserContext";
import { useCatalog } from "@/hooks/useCatalog";
import {
  PAYMENT_METHODS, formatSum, labStatusLabel, paymentMethodLabel, paymentStatusLabel,
} from "@/lib/ses";
import NewAdmissionDialog from "@/components/qabul/NewAdmissionDialog";
import { ReceiptDialog } from "@/components/qabul/DocumentDialogs";
import type { AdmissionRow } from "@/components/qabul/types";

const POLL_INTERVAL_MS = 20000;

const paymentBadge = (status: string) => {
  const cls =
    status === "tolangan" ? "bg-success/10 text-success" :
    status === "qisman" ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive";
  return <Badge className={cn("border-0", cls)}>{paymentStatusLabel(status)}</Badge>;
};

const processFromOrders = (a: AdmissionRow) => {
  const orders = a.lab_orders ?? [];
  if (!orders.length) return "Qabul qilindi";
  if (orders.every((o) => o.status === "yakunlandi")) return "Yakunlandi";
  if (orders.some((o) => o.status === "natija_tasdiqlandi")) return "Natija tasdiqlandi";
  if (orders.some((o) => o.status === "natija_tayyor")) return "Natija tayyor";
  if (orders.some((o) => o.status === "jarayonda")) return "Analiz jarayonida";
  if (orders.some((o) => o.status === "namuna_qabul")) return "Namuna qabul qilindi";
  if (orders.some((o) => o.status === "mijoz_keldi")) return "Mijoz keldi";
  return "Laboratoriyaga yo'naltirildi";
};

const QabulTolovAdmin = () => {
  const { toast } = useToast();
  const { districtId } = useUserContext();
  const { laboratories, services } = useCatalog();

  const [admissions, setAdmissions] = useState<AdmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [operatorName, setOperatorName] = useState("");

  const [newOpen, setNewOpen] = useState(false);
  const [receipt, setReceipt] = useState<AdmissionRow | null>(null);
  const [details, setDetails] = useState<AdmissionRow | null>(null);
  const [payTarget, setPayTarget] = useState<AdmissionRow | null>(null);
  const [payAmount, setPayAmount] = useState("0");
  const [payMethod, setPayMethod] = useState("naqd");
  const [paySaving, setPaySaving] = useState(false);

  const [editTarget, setEditTarget] = useState<AdmissionRow | null>(null);
  const [editForm, setEditForm] = useState({
    last_name: "", first_name: "", birth_date: "", gender: "erkak",
    phone: "", address: "", workplace: "", service_type: "Laboratoriya tekshiruvi",
  });
  const [editLabs, setEditLabs] = useState<Record<string, string>>({});
  const [editSaving, setEditSaving] = useState(false);

  const openEdit = (a: AdmissionRow) => {
    const c = a.clients;
    setEditForm({
      last_name: c?.last_name ?? "",
      first_name: c?.first_name ?? "",
      birth_date: c?.birth_date ?? "",
      gender: c?.gender ?? "erkak",
      phone: c?.phone ?? "",
      address: c?.address ?? "",
      workplace: c?.workplace ?? "",
      service_type: c?.service_type ?? "Laboratoriya tekshiruvi",
    });
    setEditLabs(
      a.admission_items.reduce((acc, item) => {
        acc[item.id] = item.laboratory_id ?? "";
        return acc;
      }, {} as Record<string, string>)
    );
    setEditTarget(a);
  };

  const handleSaveClient = async () => {
    if (!editTarget) return;
    if (!editForm.last_name.trim() || !editForm.first_name.trim()) {
      toast({ title: "Xatolik", description: "Familiya va ism to'ldirilishi shart", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      await api.patch(`/clients/${editTarget.client_id}/`, {
        last_name: editForm.last_name.trim(),
        first_name: editForm.first_name.trim(),
        birth_date: editForm.birth_date || null,
        birth_year: editForm.birth_date ? editForm.birth_date.slice(0, 4) : (editTarget.clients?.birth_year ?? ""),
        gender: editForm.gender,
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || "—",
        workplace: editForm.workplace.trim() || "—",
        service_type: editForm.service_type.trim() || "Laboratoriya tekshiruvi",
      });

      // Update laboratory assignments
      for (const item of editTarget.admission_items) {
        const newLabId = editLabs[item.id];
        if (newLabId && newLabId !== item.laboratory_id) {
          await api.patch(`/admission-items/${item.id}/`, { laboratory_id: newLabId });

          const matchingOrder = editTarget.lab_orders.find((o) => o.admission_item_id === item.id);
          if (matchingOrder) {
            await api.patch(`/lab-orders/${matchingOrder.id}/`, { laboratory_id: newLabId });
          }
        }
      }

      toast({ title: "Muvaffaqiyatli", description: "Mijoz ma'lumotlari va laboratoriya biriktirishlari yangilandi" });
      setEditTarget(null);
      fetchAdmissions();
    } catch (error) {
      logError("Mijozni tahrirlashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Ma'lumotlarni saqlashda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const [labFilter, setLabFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [processFilter, setProcessFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const labName = (id: string | null) => laboratories.find((l) => l.id === id)?.name ?? "Biriktirilmagan";

  const fetchAdmissions = async () => {
    try {
      const { data } = await api.get<AdmissionRow[]>("/admissions/");
      setAdmissions(data ?? []);
    } catch (error) {
      logError("Qabullarni yuklashda xatolik:", error);
      toast({ title: "Xatolik", description: "Qabullarni yuklashda xatolik yuz berdi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissions();
    fetchMe().then((me) => setOperatorName(me?.email ?? "Operator"));

    const interval = setInterval(fetchAdmissions, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    return admissions.filter((a) => {
      const matchLab = labFilter === "all" || a.admission_items.some((i) => i.laboratory_id === labFilter);
      const matchService = serviceFilter === "all" || a.admission_items.some((i) => i.service_name === serviceFilter);
      const matchPay = payFilter === "all" || a.payment_status === payFilter;
      const matchProcess = processFilter === "all" || processFromOrders(a) === processFilter;
      const matchDate = !dateFilter || format(new Date(a.created_at), "yyyy-MM-dd") === dateFilter;

      return matchLab && matchService && matchPay && matchProcess && matchDate;
    });
  }, [admissions, labFilter, serviceFilter, payFilter, processFilter, dateFilter]);

  const today = format(new Date(), "yyyy-MM-dd");
  const stats = [
    { label: "Bugungi qabul", value: admissions.filter((a) => format(new Date(a.created_at), "yyyy-MM-dd") === today).length, icon: Users, color: "primary" },
    { label: "Bugungi tushum", value: formatSum(admissions.filter((a) => format(new Date(a.created_at), "yyyy-MM-dd") === today).reduce((s, a) => s + Number(a.paid_amount), 0)), icon: Wallet, color: "success" },
    { label: "To'lanmagan", value: admissions.filter((a) => a.payment_status !== "tolangan").length, icon: Receipt, color: "warning" },
    { label: "Jarayondagi analizlar", value: admissions.reduce((s, a) => s + a.lab_orders.filter((o) => !["yakunlandi", "natija_tasdiqlandi"].includes(o.status)).length, 0), icon: FlaskConical, color: "info" },
  ];

  const handleAddPayment = async () => {
    if (!payTarget || !districtId) return;
    const amount = Number(payAmount) || 0;
    if (amount <= 0) {
      toast({ title: "Xatolik", description: "To'lov summasi noto'g'ri", variant: "destructive" });
      return;
    }
    setPaySaving(true);
    try {
      // Server records the payment and syncs admission/client totals atomically.
      await api.post(`/admissions/${payTarget.id}/add-payment/`, { amount, method: payMethod });

      toast({ title: "Muvaffaqiyatli", description: "To'lov qayd etildi" });
      setPayTarget(null);
      fetchAdmissions();
    } catch (error) {
      logError("To'lovni saqlashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "To'lovni saqlashda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setPaySaving(false);
    }
  };

  return (
    <AdminLayout title="Qabul va to'lov" subtitle="Mijozni ro'yxatga olish, to'lov va laboratoriyaga yo'naltirish">
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={stat.label} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                    stat.color === "primary" ? "bg-primary/10" :
                    stat.color === "info" ? "bg-info/10" :
                    stat.color === "warning" ? "bg-warning/10" : "bg-success/10")}>
                    <stat.icon className={cn("w-5 h-5",
                      stat.color === "primary" ? "text-primary" :
                      stat.color === "info" ? "text-info" :
                      stat.color === "warning" ? "text-warning" : "text-success")} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl font-display font-bold text-foreground truncate">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <CardTitle className="font-display">Qabullar</CardTitle>
            <Button onClick={() => setNewOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Yangi qabul
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid gap-3 lg:grid-cols-3">
              <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
              <Select value={labFilter} onValueChange={setLabFilter}>
                <SelectTrigger><SelectValue placeholder="Laboratoriya" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha laboratoriyalar</SelectItem>
                  {laboratories.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={serviceFilter} onValueChange={setServiceFilter}>
                <SelectTrigger><SelectValue placeholder="Analiz turi" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha analizlar</SelectItem>
                  {services.map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={payFilter} onValueChange={setPayFilter}>
                <SelectTrigger><SelectValue placeholder="To'lov holati" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha to'lov holatlari</SelectItem>
                  <SelectItem value="tolangan">To'langan</SelectItem>
                  <SelectItem value="qisman">Qisman to'langan</SelectItem>
                  <SelectItem value="tolanmagan">To'lanmagan</SelectItem>
                </SelectContent>
              </Select>
              <Select value={processFilter} onValueChange={setProcessFilter}>
                <SelectTrigger><SelectValue placeholder="Jarayon holati" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha jarayon holatlari</SelectItem>
                  {["Qabul qilindi", "Laboratoriyaga yo'naltirildi", "Mijoz keldi", "Namuna qabul qilindi", "Analiz jarayonida", "Natija tayyor", "Natija tasdiqlandi", "Yakunlandi"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => { setLabFilter("all"); setServiceFilter("all"); setPayFilter("all"); setProcessFilter("all"); setDateFilter(""); }}
              >
                Filtrlarni tozalash
              </Button>
            </div>

            {/* Table */}
            {loading ? (
              <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-muted-foreground">Qabullar topilmadi</p>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr className="text-left">
                      <th className="p-3 font-medium">ID</th>
                      <th className="p-3 font-medium">F.I.Sh.</th>
                      <th className="p-3 font-medium">Analiz</th>
                      <th className="p-3 font-medium">Laboratoriya</th>
                      <th className="p-3 font-medium">Jami summa</th>
                      <th className="p-3 font-medium">To'lov</th>
                      <th className="p-3 font-medium">Jarayon holati</th>
                      <th className="p-3 font-medium">Sana</th>
                      <th className="p-3 font-medium text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((a) => (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 whitespace-nowrap font-mono text-xs">{a.order_number}</td>
                        <td className="p-3 whitespace-nowrap font-medium text-foreground">
                          {a.clients?.last_name} {a.clients?.first_name}
                        </td>
                        <td className="p-3 max-w-[220px]">
                          <span className="line-clamp-2 text-muted-foreground">
                            {a.admission_items.map((i) => i.service_name).join(", ")}
                          </span>
                        </td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground">
                          {Array.from(new Set(a.admission_items.map((i) => labName(i.laboratory_id)))).join(", ")}
                        </td>
                        <td className="p-3 whitespace-nowrap">{formatSum(a.total_amount)}</td>
                        <td className="p-3 whitespace-nowrap">{paymentBadge(a.payment_status)}</td>
                        <td className="p-3 whitespace-nowrap">
                          <Badge variant="secondary">{processFromOrders(a)}</Badge>
                        </td>
                        <td className="p-3 whitespace-nowrap text-muted-foreground">
                          {format(new Date(a.created_at), "dd.MM.yyyy HH:mm")}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="icon" variant="ghost" title="Ko'rish" onClick={() => setDetails(a)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" title="Tahrirlash" onClick={() => openEdit(a)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {a.payment_status !== "tolangan" && (
                              <Button size="icon" variant="ghost" title="To'lov" onClick={() => { setPayTarget(a); setPayAmount(String(Math.max(0, Number(a.total_amount) - Number(a.paid_amount)))); setPayMethod(a.payment_method); }}>
                                <Wallet className="w-4 h-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="ghost" title="Chek" onClick={() => setReceipt(a)}>
                              <Receipt className="w-4 h-4" />
                            </Button>
                          </div>
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

      <NewAdmissionDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        laboratories={laboratories}
        services={services}
        districtId={districtId}
        onSaved={() => fetchAdmissions()}
      />

      <ReceiptDialog admission={receipt} open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)} labName={labName} />

      {/* Ko'rish */}
      <Dialog open={!!details} onOpenChange={(v) => !v && setDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{details?.order_number}</DialogTitle>
            <DialogDescription>Qabul va laboratoriya jarayoni</DialogDescription>
          </DialogHeader>
          {details && (
            <div className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-2">
                <p><span className="text-muted-foreground">Mijoz: </span>{details.clients?.last_name} {details.clients?.first_name}</p>
                <p><span className="text-muted-foreground">Telefon: </span>{details.clients?.phone ?? "—"}</p>
                <p><span className="text-muted-foreground">JShShIR: </span>{details.clients?.pinfl ?? "—"}</p>
                <p><span className="text-muted-foreground">Manzil: </span>{details.clients?.address}</p>
                <p><span className="text-muted-foreground">Operator: </span>{details.operator_name ?? "—"}</p>
                <p><span className="text-muted-foreground">To'lov usuli: </span>{paymentMethodLabel(details.payment_method)}</p>
              </div>
              <Separator />
              <div className="space-y-2">
                <p className="font-semibold text-foreground">Laboratoriya jarayoni</p>
                {details.lab_orders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="text-foreground">{o.service_name}</p>
                      <p className="text-xs text-muted-foreground">{labName(o.laboratory_id)} · Namuna: {o.sample_type ?? "—"}</p>
                      {o.result_text && <p className="text-xs text-muted-foreground mt-1">Natija: {o.result_text}</p>}
                    </div>
                    <Badge variant="secondary" className="shrink-0">{labStatusLabel(o.status)}</Badge>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="flex justify-between"><span className="text-muted-foreground">Jami</span><span className="font-semibold">{formatSum(details.total_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">To'langan</span><span>{formatSum(details.paid_amount)}</span></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* To'lov qo'shish */}
      <Dialog open={!!editTarget} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Mijoz ma'lumotlarini tahrirlash</DialogTitle>
            <DialogDescription>{editTarget?.order_number}</DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Familiya</Label>
              <Input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ism</Label>
              <Input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Tug'ilgan sana</Label>
              <Input type="date" value={editForm.birth_date} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Jinsi</Label>
              <Select value={editForm.gender} onValueChange={(v) => setEditForm({ ...editForm, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="erkak">Erkak</SelectItem>
                  <SelectItem value="ayol">Ayol</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Ish joyi</Label>
              <Input value={editForm.workplace} onChange={(e) => setEditForm({ ...editForm, workplace: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Manzil</Label>
              <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Xizmat turi</Label>
              <Select value={editForm.service_type} onValueChange={(v) => setEditForm({ ...editForm, service_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {services.filter((s) => s.is_active).map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="font-semibold text-sm text-foreground">Laboratoriya biriktirishlari</p>
            {editTarget?.admission_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Biriktirilgan laboratoriya yo'q</p>
            ) : (
              <div className="space-y-3">
                {editTarget?.admission_items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{item.service_name}</p>
                      <p className="text-xs text-muted-foreground">{formatSum(item.price)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Laboratoriya</Label>
                      <Select
                        value={editLabs[item.id] ?? ""}
                        onValueChange={(v) => setEditLabs((prev) => ({ ...prev, [item.id]: v }))}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Laboratoriya tanlang" />
                        </SelectTrigger>
                        <SelectContent>
                          {laboratories.filter((l) => l.is_active).map((l) => (
                            <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Bekor qilish</Button>
            <Button onClick={handleSaveClient} disabled={editSaving} className="gap-2">
              {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* To'lov qo'shish */}
      <Dialog open={!!payTarget} onOpenChange={(v) => !v && setPayTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">To'lovni tasdiqlash</DialogTitle>
            <DialogDescription>{payTarget?.order_number}</DialogDescription>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/50 p-4 space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Jami</span><span>{formatSum(payTarget.total_amount)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">To'langan</span><span>{formatSum(payTarget.paid_amount)}</span></div>
                <div className="flex justify-between font-semibold"><span>Qoldiq</span><span>{formatSum(Number(payTarget.total_amount) - Number(payTarget.paid_amount))}</span></div>
              </div>
              <div className="space-y-2">
                <Label>To'lov summasi</Label>
                <Input type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>To'lov usuli</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleAddPayment} disabled={paySaving} className="gap-2">
              {paySaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              To'lovni tasdiqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default QabulTolovAdmin;