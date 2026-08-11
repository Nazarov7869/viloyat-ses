import { useEffect, useState } from "react";
import { Loader2, Save, KeyRound, UserCog } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiErrorMessage } from "@/lib/api";
import { changePassword, updateEmail } from "@/lib/auth";
import { logError } from "@/lib/logger";
import { roleLabel } from "@/lib/ses";
import { useUserContext } from "@/hooks/useUserContext";

const ProfileSettings = () => {
  const { toast } = useToast();
  const { email, role, districtName, isProvince, loading, reload } = useUserContext();

  const [newEmail, setNewEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (email) setNewEmail(email);
  }, [email]);

  const saveEmail = async () => {
    if (!newEmail.trim() || newEmail === email) return;
    setEmailSaving(true);
    try {
      await updateEmail(newEmail.trim());
      toast({ title: "Muvaffaqiyatli", description: "Elektron pochta yangilandi" });
      reload();
    } catch (error) {
      logError("Emailni yangilashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Emailni yangilashda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setEmailSaving(false);
    }
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Xatolik", description: "Barcha maydonlarni to'ldiring", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Xatolik", description: "Yangi parollar mos kelmadi", variant: "destructive" });
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast({ title: "Muvaffaqiyatli", description: "Parol yangilandi" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      logError("Parolni yangilashda xatolik:", error);
      toast({ title: "Xatolik", description: apiErrorMessage(error, "Parolni yangilashda xatolik yuz berdi"), variant: "destructive" });
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <AdminLayout title="Profil sozlamalari" subtitle="Shaxsiy hisobingiz ma'lumotlari">
      <div className="max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <UserCog className="w-5 h-5 text-primary" />
              Hisob ma'lumotlari
            </CardTitle>
            <CardDescription>Sizning rolingiz va biriktirilgan hudud</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loading && (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{roleLabel(role)}</Badge>
                <Badge variant="outline">{isProvince ? "Jizzax viloyati" : (districtName ?? "Tuman biriktirilmagan")}</Badge>
              </div>
            )}
            <div className="space-y-2">
              <Label>Elektron pochta</Label>
              <div className="flex gap-2">
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <Button onClick={saveEmail} disabled={emailSaving || !newEmail.trim() || newEmail === email} className="gap-2 shrink-0">
                  {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Saqlash
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Parolni almashtirish
            </CardTitle>
            <CardDescription>Xavfsizlik uchun joriy parolingizni tasdiqlang</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Joriy parol</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Yangi parol</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Yangi parolni takrorlang</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <Button onClick={savePassword} disabled={passwordSaving} className="gap-2">
              {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Parolni yangilash
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ProfileSettings;
