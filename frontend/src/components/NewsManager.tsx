import { useEffect, useState } from "react";
import api, { apiErrorMessage } from "@/lib/api";
import { logError } from "@/lib/logger";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Newspaper, Trash2, Plus, Loader2, EyeOff, Eye } from "lucide-react";

interface NewsRow {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  severity: string;
  source: string | null;
  published_at: string;
  is_ai_generated: boolean;
  is_published: boolean;
}

const CATEGORIES = ["Epidemiologiya", "Sanitariya", "Emlash", "Suv sifati", "Ogohlantirish", "Qoidalar"];
const SEVERITIES = [
  { value: "new", label: "Yangi" },
  { value: "urgent", label: "Shoshilinch" },
  { value: "completed", label: "Bajarilgan" },
];

const NewsManager = () => {
  const { toast } = useToast();
  const [rows, setRows] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: CATEGORIES[0],
    severity: "new",
    source: "Jizzax viloyati SES",
  });

  const load = async () => {
    try {
      const { data } = await api.get<NewsRow[]>("/news/");
      setRows(data ?? []);
    } catch (error) {
      logError("Yangiliklarni olishda xatolik:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.title.trim() || !form.excerpt.trim()) {
      toast({ title: "Sarlavha va qisqacha matn to'ldirilishi shart", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/news/", {
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content.trim() || null,
        category: form.category,
        severity: form.severity,
        source: form.source.trim() || null,
        is_ai_generated: false,
      });
      toast({ title: "Yangilik qo'shildi" });
      setForm({ ...form, title: "", excerpt: "", content: "" });
      setShowForm(false);
      await load();
    } catch (error) {
      logError("Yangilik saqlashda xatolik:", error);
      toast({ title: "Saqlashda xatolik", description: apiErrorMessage(error), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (row: NewsRow) => {
    try {
      await api.patch(`/news/${row.id}/`, { is_published: !row.is_published });
      await load();
    } catch (error) {
      logError("Holatni o'zgartirishda xatolik:", error);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/news/${id}/`);
      await load();
    } catch (error) {
      logError("Yangilikni o'chirishda xatolik:", error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Newspaper className="w-5 h-5 text-primary" />
          Bosh sahifa yangiliklari
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-4 h-4" /> Qo'lda qo'shish
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="grid gap-3 p-4 rounded-xl border border-border bg-muted/30">
            <Input
              placeholder="Sarlavha"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <Textarea
              placeholder="Qisqacha matn"
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
            />
            <Textarea
              placeholder="To'liq matn (ixtiyoriy)"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
              >
                {SEVERITIES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <Input
                placeholder="Manba"
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Saqlash
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">Yangilik yo'q. "Qo'lda qo'shish" tugmasi orqali qo'shing.</p>
        ) : (
          <div className="max-h-[520px] overflow-auto space-y-3 pr-1">
            {rows.map((row) => (
              <div key={row.id} className="p-4 rounded-xl border border-border flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary">{row.category}</Badge>
                    {row.is_ai_generated && <Badge variant="outline">AI</Badge>}
                    {!row.is_published && <Badge variant="outline">Yashirilgan</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(row.published_at).toLocaleDateString("uz-UZ")}
                    </span>
                  </div>
                  <p className="font-medium text-foreground">{row.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{row.excerpt}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => togglePublished(row)}>
                    {row.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(row.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NewsManager;
