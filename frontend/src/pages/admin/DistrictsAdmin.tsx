import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import api from "@/lib/api";
import { logError } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Wallet, Clock, Loader2, Search, Wifi, WifiOff } from "lucide-react";

const POLL_INTERVAL_MS = 20000;

interface DistrictStat {
  id: string;
  name: string;
  code: string;
  sort_order: number;
  total_clients: number;
  today_clients: number;
  pending_clients: number;
  revenue: number;
  source: "local" | "remote" | "remote_error";
}

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  district_id: string | null;
  payment_status: string;
  payment_amount: number | null;
  registered_at: string;
}

const formatSum = (value: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(value)) + " so'm";

const sourceBadge = (source: DistrictStat["source"]) => {
  if (source === "remote") {
    return (
      <Badge variant="outline" className="gap-1 text-success border-success/30">
        <Wifi className="w-3 h-3" /> Tashqi tizim
      </Badge>
    );
  }
  if (source === "remote_error") {
    return (
      <Badge variant="outline" className="gap-1 text-destructive border-destructive/30">
        <WifiOff className="w-3 h-3" /> Tashqi tizim javob bermadi
      </Badge>
    );
  }
  return null;
};

const DistrictsAdmin = () => {
  const { code } = useParams();
  const [stats, setStats] = useState<DistrictStat[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, clientsRes] = await Promise.all([
          api.get<DistrictStat[]>("/districts/stats/"),
          api.get<ClientRow[]>("/clients/"),
        ]);
        setStats(statsRes.data ?? []);
        setClients(clientsRes.data ?? []);
      } catch (error) {
        logError("Tumanlar ma'lumotini olishda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const active = useMemo(
    () => (code ? stats.find((d) => d.code === code) ?? null : null),
    [code, stats]
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? stats.filter((s) => s.name.toLowerCase().includes(q)) : stats;
  }, [stats, search]);

  const districtClients = useMemo(
    () => (active ? clients.filter((c) => c.district_id === active.id) : []),
    [active, clients]
  );

  return (
    <AdminLayout
      title={active ? active.name : "Tumanlar"}
      subtitle={active ? "Tuman bo'yicha mijozlar" : "Jizzax viloyati tuman va shaharlari"}
    >
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : active ? (
        <div className="space-y-4">
          {active.source !== "local" && (
            <div className="flex items-center gap-2">{sourceBadge(active.source)}</div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                {active.name} — {active.source === "remote" ? active.total_clients : districtClients.length} ta mijoz
              </CardTitle>
            </CardHeader>
            <CardContent>
              {active.source === "remote" ? (
                <p className="py-10 text-center text-muted-foreground">
                  Bu hudud o'z alohida tizimida ishlaydi — mijozlar ro'yxati shu yerda ko'rsatilmaydi,
                  faqat yig'ma statistika tashqi serverdan olinadi.
                </p>
              ) : (
                <div className="max-h-[560px] overflow-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/60 sticky top-0">
                      <tr className="text-left">
                        <th className="p-3 font-semibold">F.I.Sh.</th>
                        <th className="p-3 font-semibold">To'lov holati</th>
                        <th className="p-3 font-semibold">Summa</th>
                        <th className="p-3 font-semibold">Sana</th>
                      </tr>
                    </thead>
                    <tbody>
                      {districtClients.map((c) => (
                        <tr key={c.id} className="border-t border-border hover:bg-muted/40">
                          <td className="p-3 font-medium text-foreground">{c.last_name} {c.first_name}</td>
                          <td className="p-3">
                            <Badge variant={c.payment_status === "tolangan" ? "default" : "secondary"}>
                              {c.payment_status}
                            </Badge>
                          </td>
                          <td className="p-3 whitespace-nowrap">{formatSum(Number(c.payment_amount ?? 0))}</td>
                          <td className="p-3">{new Date(c.registered_at).toLocaleDateString("uz-UZ")}</td>
                        </tr>
                      ))}
                      {districtClients.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-muted-foreground">
                            Bu hududda mijozlar yo'q
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tuman qidirish..."
              className="pl-9"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((s) => (
              <Link key={s.id} to={`/admin/tumanlar/${s.code}`}>
                <Card className="hover:border-primary/50 transition-colors h-full">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground truncate">{s.name}</p>
                      </div>
                      {sourceBadge(s.source)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Jami</p>
                        <p className="font-semibold">{s.total_clients}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" />Bugun</p>
                        <p className="font-semibold">{s.today_clients}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Kutilmoqda</p>
                        <p className="font-semibold">{s.pending_clients}</p>
                      </div>
                    </div>
                    <p className="text-sm flex items-center gap-1.5 text-muted-foreground">
                      <Wallet className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">{formatSum(s.revenue)}</span>
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {visible.length === 0 && (
              <p className="text-muted-foreground">Hudud topilmadi</p>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default DistrictsAdmin;
