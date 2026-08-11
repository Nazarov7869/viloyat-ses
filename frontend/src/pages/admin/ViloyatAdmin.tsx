import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import api from "@/lib/api";
import { logError } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import NewsManager from "@/components/NewsManager";
import { Building2, Users, Wallet, Clock, Loader2, Search, TrendingUp, Wifi, WifiOff } from "lucide-react";

const POLL_INTERVAL_MS = 20000;

interface DistrictStat {
  id: string;
  name: string;
  total_clients: number;
  today_clients: number;
  pending_clients: number;
  paid_clients: number;
  revenue: number;
  source: "local" | "remote" | "remote_error";
}

const formatSum = (value: number) =>
  new Intl.NumberFormat("uz-UZ").format(Math.round(value)) + " so'm";

const SourceIcon = ({ source }: { source: DistrictStat["source"] }) => {
  if (source === "remote") return <Wifi className="w-3.5 h-3.5 text-success" />;
  if (source === "remote_error") return <WifiOff className="w-3.5 h-3.5 text-destructive" />;
  return null;
};

const ViloyatAdmin = () => {
  const [stats, setStats] = useState<DistrictStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get<DistrictStat[]>("/districts/stats/");
        setStats(data ?? []);
      } catch (error) {
        logError("Viloyat ma'lumotlarini olishda xatolik:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const totals = useMemo(
    () =>
      stats.reduce(
        (acc, s) => ({
          total: acc.total + s.total_clients,
          today: acc.today + s.today_clients,
          pending: acc.pending + s.pending_clients,
          revenue: acc.revenue + s.revenue,
        }),
        { total: 0, today: 0, pending: 0, revenue: 0 }
      ),
    [stats]
  );

  const visibleStats = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q ? stats.filter((s) => s.name.toLowerCase().includes(q)) : stats;
    return [...filtered].sort((a, b) => b.total_clients - a.total_clients);
  }, [stats, search]);

  const maxTotal = Math.max(1, ...stats.map((s) => s.total_clients));

  const remoteConnectedCount = stats.filter((s) => s.source === "remote").length;
  const remoteErrorCount = stats.filter((s) => s.source === "remote_error").length;

  const summaryCards = [
    { icon: Building2, label: "Hududlar", value: String(stats.length) },
    { icon: Users, label: "Jami mijozlar", value: String(totals.total) },
    { icon: Clock, label: "Bugun qabul qilingan", value: String(totals.today) },
    { icon: Wallet, label: "Umumiy tushum", value: formatSum(totals.revenue) },
  ];

  return (
    <AdminLayout title="Jizzax viloyati paneli" subtitle="Barcha tuman va shaharlar bo'yicha umumiy ko'rinish">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label}>
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <card.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <p className="text-xl font-bold text-foreground truncate">{card.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(remoteConnectedCount > 0 || remoteErrorCount > 0) && (
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {remoteConnectedCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Wifi className="w-4 h-4 text-success" /> {remoteConnectedCount} ta hudud o'z tizimidan ulangan
                </span>
              )}
              {remoteErrorCount > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <WifiOff className="w-4 h-4 text-destructive" /> {remoteErrorCount} ta hudud serveriga ulanib bo'lmadi
                </span>
              )}
            </div>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-primary" />
                Tumanlar kesimida
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tuman qidirish..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[520px] overflow-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 sticky top-0">
                    <tr className="text-left">
                      <th className="p-3 font-semibold">Hudud</th>
                      <th className="p-3 font-semibold">Jami</th>
                      <th className="p-3 font-semibold">Bugun</th>
                      <th className="p-3 font-semibold">Kutilmoqda</th>
                      <th className="p-3 font-semibold">To'langan</th>
                      <th className="p-3 font-semibold">Tushum</th>
                      <th className="p-3 font-semibold w-40">Ulush</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStats.map((s) => (
                      <tr key={s.id} className="border-t border-border hover:bg-muted/40">
                        <td className="p-3 font-medium text-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <SourceIcon source={s.source} />
                            {s.name}
                          </span>
                        </td>
                        <td className="p-3">{s.total_clients}</td>
                        <td className="p-3">{s.today_clients}</td>
                        <td className="p-3">
                          {s.pending_clients > 0 ? (
                            <Badge variant="secondary">{s.pending_clients}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="p-3">{s.paid_clients}</td>
                        <td className="p-3 whitespace-nowrap">{formatSum(s.revenue)}</td>
                        <td className="p-3">
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${(s.total_clients / maxTotal) * 100}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                    {visibleStats.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                          Hudud topilmadi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <NewsManager />
        </div>
      )}
    </AdminLayout>
  );
};

export default ViloyatAdmin;
