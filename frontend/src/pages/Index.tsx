import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Shield, 
  Microscope, 
  Users, 
  FileText, 
  ArrowRight, 
  Activity,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Building2,
  Syringe,
  ShieldCheck
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import api from "@/lib/api";
import { logError } from "@/lib/logger";

const POLL_INTERVAL_MS = 30000;

interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  severity: string;
  source: string | null;
  published_at: string;
}

interface PublicStats {
  total_clients: number;
  month_clients: number;
  today_clients: number;
  completion_rate: number;
  districts: number;
}

const categoryIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes("suv")) return Droplets;
  if (c.includes("emlash")) return Syringe;
  if (c.includes("sanitariya")) return ShieldCheck;
  if (c.includes("ogohlantirish")) return AlertTriangle;
  if (c.includes("qoida")) return FileText;
  return Activity;
};

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("uz-UZ", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

const Index = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loadingNews, setLoadingNews] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [newsRes, statsRes] = await Promise.all([
          api.get<NewsItem[]>("/news/", { params: { is_published: true } }),
          api.get<PublicStats>("/public-stats/"),
        ]);

        setNews((newsRes.data ?? []).slice(0, 6));
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (error) {
        logError("Bosh sahifa ma'lumotlarini olishda xatolik:", error);
      } finally {
        setLoadingNews(false);
      }
    };

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Jami ro'yxatlar", value: stats ? stats.total_clients.toLocaleString("uz-UZ") : "—", icon: Users },
    { label: "Bu oydagi qabullar", value: stats ? stats.month_clients.toLocaleString("uz-UZ") : "—", icon: FileText },
    { label: "Xizmat bajarilishi", value: stats ? `${stats.completion_rate}%` : "—", icon: CheckCircle2 },
    { label: "Qamrab olingan hududlar", value: stats ? String(stats.districts) : "—", icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">SanEpi</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login">
              <Button variant="outline" size="lg">
                Admin kirish
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 min-h-[600px] flex items-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-sidebar/95 via-sidebar/80 to-sidebar/60" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-2xl animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 text-primary-foreground mb-6">
              <Microscope className="w-4 h-4" />
              <span className="text-sm font-medium">Sanitariya va Epidemiologiya Boshqaruvi</span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-sidebar-foreground mb-6 leading-tight">
              Ma'lumotlarga asoslangan{" "}
              <span className="text-sidebar-primary">yechimlar</span> orqali jamoat salomatligini himoya qilish
            </h1>
            <p className="text-lg text-sidebar-foreground/80 mb-8 leading-relaxed">
              Barcha ro'yxatdan o'tgan muassasalarda sanitariya monitoringi, epidemiologik kuzatuv 
              va jamoat salomatligi muvofiqligini kuzatish uchun kompleks boshqaruv tizimi.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login">
                <Button variant="hero" size="xl">
                  Admin portaliga kirish
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button variant="outline" size="xl" className="bg-sidebar-foreground/10 border-sidebar-foreground/20 text-sidebar-foreground hover:bg-sidebar-foreground/20">
                Hisobotlarni ko'rish
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-muted/50 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {statCards.map((stat, index) => (
              <div 
                key={stat.label} 
                className="flex items-center gap-4 p-4 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="font-display text-3xl font-bold text-foreground mb-2">So'nggi yangiliklar</h2>
              <p className="text-muted-foreground">Jizzax viloyati SES bo'yicha muntazam yangilanadigan dolzarb ma'lumotlar</p>
            </div>
            {stats && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Bugun qabul qilinganlar: <span className="font-semibold text-foreground">{stats.today_clients}</span>
              </div>
            )}
          </div>
          
          {loadingNews ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : news.length === 0 ? (
            <div className="p-10 text-center bg-card rounded-2xl border border-border text-muted-foreground">
              Hozircha yangilik joylanmagan.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {news.map((item, index) => {
                const Icon = categoryIcon(item.category);
                return (
                  <article 
                    key={item.id}
                    className="group p-6 bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                        item.severity === 'urgent' ? 'bg-destructive/10' : 
                        item.severity === 'completed' ? 'bg-success/10' : 'bg-primary/10'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          item.severity === 'urgent' ? 'text-destructive' : 
                          item.severity === 'completed' ? 'text-success' : 'text-primary'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                            item.severity === 'urgent' ? 'bg-destructive/10 text-destructive' : 
                            item.severity === 'completed' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
                          }`}>
                            {item.category}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(item.published_at)}</span>
                          {item.source && (
                            <span className="text-xs text-muted-foreground">• {item.source}</span>
                          )}
                        </div>
                        <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-2">
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {item.excerpt}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold text-foreground mb-4">
              Admin portal modullari
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Jamoat salomatligini saqlash operatsiyalarini kompleks boshqarish uchun ixtisoslashtirilgan boshqaruv panellariga kirish
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">Asosiy boshqaruv</h3>
              <p className="text-muted-foreground mb-4">
                Tizim umumiy ko'rinishi, foydalanuvchilarni boshqarish va operatsion statistika uchun markaziy boshqaruv paneli.
              </p>
              <Link to="/login" className="text-primary font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                Boshqaruv paneliga kirish <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="p-8 bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">To'lovlarni boshqarish</h3>
              <p className="text-muted-foreground mb-4">
                Ro'yxatdan o'tish to'lovlari, tekshiruv to'lovlari va moliyaviy hisobotlarni boshqarish.
              </p>
              <Link to="/login" className="text-primary font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                Boshqaruv paneliga kirish <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="p-8 bg-card rounded-2xl border border-border shadow-card hover:shadow-card-hover transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7 text-primary-foreground" />
              </div>
              <h3 className="font-display font-bold text-xl text-foreground mb-3">Ro'yxatdan o'tganlarni boshqarish</h3>
              <p className="text-muted-foreground mb-4">
                Muassasalarni ro'yxatdan o'tkazish, muvofiqlikni kuzatish va sertifikatlash holatini boshqarish.
              </p>
              <Link to="/login" className="text-primary font-medium inline-flex items-center gap-1 hover:gap-2 transition-all">
                Boshqaruv paneliga kirish <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-sidebar text-sidebar-foreground border-t border-sidebar-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-sidebar-primary-foreground" />
              </div>
              <span className="font-display font-semibold">SanEpi Boshqaruv Tizimi</span>
            </div>
            <p className="text-sm text-sidebar-foreground/60">
              © 2024 Sanitariya va Epidemiologiya bo'limi. Barcha huquqlar himoyalangan.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;