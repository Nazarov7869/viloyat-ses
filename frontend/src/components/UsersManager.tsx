import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api, { apiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { logError } from "@/lib/logger";
import { ROLE_OPTIONS } from "@/lib/ses";

interface DistrictOption { id: string; name: string }
interface UserRow {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  role: string | null;
  district_id: string | null;
  district_name: string | null;
}

const DISTRICT_REQUIRED_ROLES = ["qabul", "payment", "registrants"];
const NO_DISTRICT = "none";

const UsersManager = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", role: "qabul", district_id: "" });

  const load = async () => {
    try {
      const [usersRes, districtsRes] = await Promise.all([
        api.get<UserRow[]>("/admin/users/"),
        api.get<DistrictOption[]>("/districts/", { params: { is_active: true } }),
      ]);
      setUsers(usersRes.data ?? []);
      setDistricts(districtsRes.data ?? []);
    } catch (error) {
      logError("Foydalanuvchilarni yuklashda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      toast({ title: "Xatolik", description: "Email va parol kiritilishi shart", variant: "destructive" });
      return;
    }
    if (DISTRICT_REQUIRED_ROLES.includes(form.role) && !form.district_id) {
      toast({ title: "Xatolik", description: "Bu rol uchun tuman tanlanishi shart", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      await api.post("/admin/users/", {
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        district_id: form.district_id || null,
      });
      toast({ title: "Muvaffaqiyatli", description: "Foydalanuvchi yaratildi" });
      setForm({ email: "", password: "", role: "qabul", district_id: "" });
      load();
    } catch (error) {
      logError("Foydalanuvchi yaratishda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Foydalanuvchi yaratishda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const updateUser = async (id: string, patch: Record<string, unknown>) => {
    setSavingId(id);
    try {
      await api.patch(`/admin/users/${id}/`, patch);
      load();
    } catch (error) {
      logError("Foydalanuvchini yangilashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Yangilashda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const removeUser = async (id: string) => {
    try {
      await api.delete(`/admin/users/${id}/`);
      toast({ title: "O'chirildi", description: "Foydalanuvchi o'chirildi" });
      load();
    } catch (error) {
      logError("Foydalanuvchini o'chirishda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "O'chirishda xatolik yuz berdi"), variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Foydalanuvchilar</CardTitle>
        <CardDescription>Hisob yaratish, rol va tuman biriktirish</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        ) : (
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="grid gap-2 sm:grid-cols-12 items-center rounded-xl border border-border p-3">
                <div className="sm:col-span-4 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                  {u.is_superuser && <Badge variant="outline" className="mt-1">Superuser</Badge>}
                </div>
                <Select value={u.role ?? ""} onValueChange={(v) => updateUser(u.id, { role: v })} disabled={savingId === u.id}>
                  <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Rol yo'q" /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={u.district_id ?? NO_DISTRICT}
                  onValueChange={(v) => updateUser(u.id, { district_id: v === NO_DISTRICT ? null : v })}
                  disabled={savingId === u.id}
                >
                  <SelectTrigger className="sm:col-span-3"><SelectValue placeholder="Tuman yo'q" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DISTRICT}>Tuman biriktirilmagan</SelectItem>
                    {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="sm:col-span-1"
                  disabled={savingId === u.id}
                  onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                >
                  {u.is_active ? "Faol" : "Nofaol"}
                </Button>
                <Button size="icon" variant="ghost" className="sm:col-span-1 justify-self-end" onClick={() => removeUser(u.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-muted-foreground">Foydalanuvchilar yo'q</p>}
          </div>
        )}

        <div className="rounded-xl border border-dashed border-border p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Yangi foydalanuvchi</p>
          <div className="grid gap-3 sm:grid-cols-12">
            <div className="sm:col-span-4 space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="sm:col-span-3 space-y-2">
              <Label>Parol</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="sm:col-span-3 space-y-2">
              <Label>Rol</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label>Tuman</Label>
              <Select
                value={form.district_id || NO_DISTRICT}
                onValueChange={(v) => setForm({ ...form, district_id: v === NO_DISTRICT ? "" : v })}
              >
                <SelectTrigger><SelectValue placeholder="Tanlang" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_DISTRICT}>—</SelectItem>
                  {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={createUser} disabled={creating} className="gap-2">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Foydalanuvchi qo'shish
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default UsersManager;
