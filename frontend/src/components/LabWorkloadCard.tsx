import { useEffect, useState } from "react";
import { FlaskConical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { logError } from "@/lib/logger";

interface Row { id: string; name: string; active: number; ready: number }

const POLL_INTERVAL_MS = 20000;

const LabWorkloadCard = () => {
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    try {
      const [labRes, orderRes] = await Promise.all([
        api.get<{ id: string; name: string }[]>("/laboratories/", { params: { is_active: true } }),
        api.get<{ laboratory_id: string; status: string }[]>("/lab-orders/"),
      ]);
      const orders = orderRes.data ?? [];
      setRows(
        (labRes.data ?? []).map((l) => ({
          id: l.id,
          name: l.name,
          active: orders.filter((o) => o.laboratory_id === l.id && !["yakunlandi", "natija_tasdiqlandi"].includes(o.status)).length,
          ready: orders.filter((o) => o.laboratory_id === l.id && ["natija_tayyor", "natija_tasdiqlandi", "yakunlandi"].includes(o.status)).length,
        })),
      );
    } catch (error) {
      logError("Laboratoriya yuklamasini olishda xatolik:", error);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-primary" />
          Laboratoriyalar yuklamasi
        </CardTitle>
        <CardDescription>Faol analizlar va tayyor natijalar</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-border p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">{r.name}</p>
                <p className="text-xs text-muted-foreground">Tayyor natijalar: {r.ready}</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-0 shrink-0">{r.active} faol</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LabWorkloadCard;
