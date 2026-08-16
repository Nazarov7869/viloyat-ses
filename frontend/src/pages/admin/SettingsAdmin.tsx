import { useMemo, useState } from "react";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api, { apiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";
import { useCatalog } from "@/hooks/useCatalog";
import UsersManager from "@/components/UsersManager";
import { CONCLUSION_TEMPLATES } from "@/lib/ses";

const ALL_LABS = "__all_labs__";
const ALL_DISTRICTS = "__all_districts__";
const UNIVERSAL_DISTRICT = "__universal__";
const GENERIC_TEMPLATE = "__generic__";

const SettingsAdmin = () => {
  const { toast } = useToast();
  const { laboratories, services, districts, loading, reload } = useCatalog();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [labNames, setLabNames] = useState<Record<string, string>>({});
  const [labFilter, setLabFilter] = useState(ALL_LABS);
  const [districtFilter, setDistrictFilter] = useState(ALL_DISTRICTS);
  const [newService, setNewService] = useState({
    name: "", service_type: "Laboratoriya tekshiruvi", sample_type: "Namuna", price: "0",
    laboratory_id: "", district_id: UNIVERSAL_DISTRICT, conclusion_template: GENERIC_TEMPLATE,
  });

  const saveLab = async (id: string) => {
    const name = (labNames[id] ?? "").trim();
    if (!name) return;
    setSavingId(id);
    try {
      await api.patch(`/laboratories/${id}/`, { name });
      toast({ title: "Saqlandi", description: "Laboratoriya nomi yangilandi" });
      reload();
    } catch (error) {
      logError("Laboratoriyani saqlashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Saqlashda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const saveService = async (
    id: string,
    patch: {
      name?: string; sample_type?: string; price?: number; laboratory_id?: string;
      district_id?: string | null; conclusion_template?: string;
    },
  ) => {
    setSavingId(id);
    try {
      await api.patch(`/services/${id}/`, patch);
      toast({ title: "Saqlandi", description: "Analiz ma'lumotlari yangilandi" });
      reload();
    } catch (error) {
      logError("Analizni saqlashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Saqlashda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const addService = async () => {
    if (!newService.name.trim() || !newService.laboratory_id) {
      toast({ title: "Xatolik", description: "Analiz nomi va laboratoriya tanlanishi shart", variant: "destructive" });
      return;
    }
    setSavingId("new");
    try {
      await api.post("/services/", {
        name: newService.name.trim(),
        service_type: newService.service_type,
        sample_type: newService.sample_type,
        price: Number(newService.price) || 0,
        laboratory_id: newService.laboratory_id,
        district_id: newService.district_id === UNIVERSAL_DISTRICT ? null : newService.district_id,
        conclusion_template: newService.conclusion_template === GENERIC_TEMPLATE ? "" : newService.conclusion_template,
      });
      setNewService({
        name: "", service_type: "Laboratoriya tekshiruvi", sample_type: "Namuna", price: "0",
        laboratory_id: "", district_id: UNIVERSAL_DISTRICT, conclusion_template: GENERIC_TEMPLATE,
      });
      toast({ title: "Qo'shildi", description: "Yangi analiz qo'shildi" });
      reload();
    } catch (error) {
      logError("Analiz qo'shishda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Qo'shishda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      if (!s.is_active) return false;
      if (labFilter !== ALL_LABS && s.laboratory_id !== labFilter) return false;
      if (districtFilter === ALL_DISTRICTS) return true;
      if (districtFilter === UNIVERSAL_DISTRICT) return s.district_id === null;
      return s.district_id === districtFilter;
    });
  }, [services, labFilter, districtFilter]);

  const removeService = async (id: string) => {
    try {
      await api.patch(`/services/${id}/`, { is_active: false });
      toast({ title: "O'chirildi", description: "Analiz nofaol qilindi" });
      reload();
    } catch (error) {
      logError("Analizni o'chirishda xatolik:", error);
    }
  };

  return (
    <AdminLayout title="Sozlamalar" subtitle="Laboratoriyalar va analizlar konfiguratsiyasi">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Laboratoriyalar</CardTitle>
            <CardDescription>Laboratoriya nomlarini tahrirlash</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
            {laboratories.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-14">{l.code}</span>
                <Input
                  value={labNames[l.id] ?? l.name}
                  onChange={(e) => setLabNames((p) => ({ ...p, [l.id]: e.target.value }))}
                />
                <Button size="sm" variant="outline" disabled={savingId === l.id} onClick={() => saveLab(l.id)} className="gap-2">
                  {savingId === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Saqlash
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display">Analizlar va narxlar</CardTitle>
            <CardDescription>Viloyat va har bir tuman qabul bo'limidagi xizmatlarni qo'shish, o'chirish va narxini o'zgartirish</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 items-end">
              <div className="space-y-2">
                <Label>Laboratoriya bo'yicha filtr</Label>
                <Select value={labFilter} onValueChange={setLabFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LABS}>Barcha laboratoriyalar</SelectItem>
                    {laboratories.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex items-end gap-3">
                <div className="flex-1 space-y-2">
                  <Label>Tuman bo'yicha filtr</Label>
                  <Select value={districtFilter} onValueChange={setDistrictFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL_DISTRICTS}>Barcha tumanlar</SelectItem>
                      <SelectItem value={UNIVERSAL_DISTRICT}>Umumiy (barcha tumanlar)</SelectItem>
                      {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground whitespace-nowrap pb-2">
                  Jami: {filteredServices.length} ta xizmat
                </p>
              </div>
            </div>

            <div className="max-h-[420px] overflow-y-auto space-y-3 pr-1">
              {filteredServices.map((s) => (
                <div key={s.id} className="grid gap-2 sm:grid-cols-12 items-center rounded-xl border border-border p-3">
                  <Input className="sm:col-span-4" defaultValue={s.name} onBlur={(e) => e.target.value !== s.name && saveService(s.id, { name: e.target.value })} />
                  <Input className="sm:col-span-2" defaultValue={s.sample_type} onBlur={(e) => e.target.value !== s.sample_type && saveService(s.id, { sample_type: e.target.value })} />
                  <Input className="sm:col-span-1" type="number" defaultValue={s.price} onBlur={(e) => Number(e.target.value) !== Number(s.price) && saveService(s.id, { price: Number(e.target.value) })} />
                  <Select value={s.laboratory_id ?? ""} onValueChange={(v) => saveService(s.id, { laboratory_id: v })}>
                    <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Laboratoriya" /></SelectTrigger>
                    <SelectContent>
                      {laboratories.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={s.district_id ?? UNIVERSAL_DISTRICT}
                    onValueChange={(v) => saveService(s.id, { district_id: v === UNIVERSAL_DISTRICT ? null : v })}
                  >
                    <SelectTrigger className="sm:col-span-2"><SelectValue placeholder="Tuman" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNIVERSAL_DISTRICT}>Umumiy</SelectItem>
                      {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="sm:col-span-1 justify-self-end" onClick={() => removeService(s.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                  <div className="sm:col-span-12 flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Xulosa shabloni</Label>
                    <Select
                      value={s.conclusion_template || GENERIC_TEMPLATE}
                      onValueChange={(v) => saveService(s.id, { conclusion_template: v === GENERIC_TEMPLATE ? "" : v })}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONCLUSION_TEMPLATES.map((t) => (
                          <SelectItem key={t.value || GENERIC_TEMPLATE} value={t.value || GENERIC_TEMPLATE}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              {filteredServices.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Filtrga mos xizmat topilmadi</p>
              )}
            </div>

            <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Yangi xizmat qo'shish</p>
              <div className="grid gap-3 sm:grid-cols-12">
                <div className="sm:col-span-4 space-y-2">
                  <Label>Xizmat nomi</Label>
                  <Input value={newService.name} onChange={(e) => setNewService({ ...newService, name: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Namuna turi</Label>
                  <Input value={newService.sample_type} onChange={(e) => setNewService({ ...newService, sample_type: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Narxi</Label>
                  <Input type="number" value={newService.price} onChange={(e) => setNewService({ ...newService, price: e.target.value })} />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Laboratoriya</Label>
                  <Select value={newService.laboratory_id} onValueChange={(v) => setNewService({ ...newService, laboratory_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                    <SelectContent>
                      {laboratories.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <Label>Tuman</Label>
                  <Select value={newService.district_id} onValueChange={(v) => setNewService({ ...newService, district_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNIVERSAL_DISTRICT}>Umumiy (barcha tumanlar)</SelectItem>
                      {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4 space-y-2">
                  <Label>Xulosa shabloni</Label>
                  <Select
                    value={newService.conclusion_template}
                    onValueChange={(v) => setNewService({ ...newService, conclusion_template: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONCLUSION_TEMPLATES.map((t) => (
                        <SelectItem key={t.value || GENERIC_TEMPLATE} value={t.value || GENERIC_TEMPLATE}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={addService} disabled={savingId === "new"} className="gap-2">
                {savingId === "new" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Qo'shish
              </Button>
            </div>
          </CardContent>
        </Card>

        <UsersManager />
      </div>
    </AdminLayout>
  );
};

export default SettingsAdmin;