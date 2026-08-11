import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Shield,
  Menu,
  X,
  ChevronDown,
  Bell,
  Building2,
  FlaskConical,
  MapPin,
  Wallet,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import api from "@/lib/api";
import { logout } from "@/lib/auth";
import { useUserContext } from "@/hooks/useUserContext";

interface LabItem { id: string; name: string; code: string }
interface DistrictItem { id: string; name: string; code: string }
interface NotificationItem { id: string; type: string; title: string; message: string; created_at: string }

const NOTIF_POLL_MS = 20000;
const LAST_SEEN_KEY = "ses_notif_last_seen";

const relativeTime = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "hozirgina";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
};

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

const AdminLayout = ({ children, title, subtitle }: AdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [districtsOpen, setDistrictsOpen] = useState(true);
  const { role, email, districtName, isProvince } = useUserContext();
  const [laboratories, setLaboratories] = useState<LabItem[]>([]);
  const [districts, setDistricts] = useState<DistrictItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const { data } = await api.get<NotificationItem[]>("/notifications/");
        if (!active) return;
        setNotifications(data ?? []);
        const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
        const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0;
        setUnreadCount((data ?? []).filter((n) => new Date(n.created_at).getTime() > lastSeenTime).length);
      } catch {
        // notifications are non-critical; fail silently
      }
    };
    load();
    const interval = setInterval(load, NOTIF_POLL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const handleNotifOpenChange = (open: boolean) => {
    setNotifOpen(open);
    if (open) {
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    let active = true;
    api
      .get("/laboratories/", { params: { is_active: true } })
      .then(({ data }) => {
        if (active && data) setLaboratories(data as LabItem[]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    api
      .get("/districts/", { params: { is_active: true } })
      .then(({ data }) => {
        if (active && data) setDistricts(data as DistrictItem[]);
      });
    return () => { active = false; };
  }, []);

  // Auto-open Tumanlar accordion when on a district route
  useEffect(() => {
    if (location.pathname.startsWith("/admin/tumanlar")) {
      setDistrictsOpen(true);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    localStorage.removeItem('adminRole');
    navigate('/login');
  };

  const adminRole = role ?? localStorage.getItem('adminRole') ?? 'main';
  const scopeLabel = isProvince ? "Jizzax viloyati" : districtName;

  const allNavItems = [
    { icon: LayoutDashboard, label: "Boshqaruv paneli", path: "/admin/main", roles: ["main"] },
    { icon: Wallet, label: "Qabul va to'lov", path: "/admin/qabul-tolov", roles: ["main", "qabul", "payment"] },
    { icon: Users, label: "Ro'yxatdan o'tganlar", path: "/admin/registrants", roles: ["main", "registrants"] },
    { icon: Building2, label: "Viloyat ko'rinishi", path: "/admin/viloyat", roles: ["viloyat"] },
  ];

  // Filter nav items based on role
  const mainNavItems = allNavItems.filter(item => item.roles.includes(adminRole));

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        sidebarOpen ? "w-64" : "w-20",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-sidebar-primary-foreground" />
            </div>
            {sidebarOpen && (
              <span className="font-display font-bold text-lg">SanEpi</span>
            )}
          </Link>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:block p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            <ChevronDown className={cn(
              "w-4 h-4 transition-transform",
              sidebarOpen ? "rotate-90" : "-rotate-90"
            )} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {mainNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive(item.path) 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                  : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </Link>
          ))}

          {adminRole !== "viloyat" && laboratories.length > 0 && (
            <div className="pt-2">
              {sidebarOpen && (
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                  Laboratoriyalar
                </p>
              )}
              <div className="space-y-1">
                {laboratories.map((lab) => (
                  <Link
                    key={lab.id}
                    to={`/admin/laboratoriya/${lab.code}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                      isActive(`/admin/laboratoriya/${lab.code}`)
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    )}
                  >
                    <FlaskConical className="w-4 h-4 shrink-0" />
                    {sidebarOpen && <span className="text-sm font-medium truncate">{lab.name}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(adminRole === "main" || adminRole === "viloyat") && districts.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setDistrictsOpen(!districtsOpen)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <Building2 className="w-4 h-4 shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="text-sm font-medium flex-1 text-left">Tumanlar</span>
                    <ChevronDown className={cn(
                      "w-4 h-4 transition-transform duration-200",
                      districtsOpen ? "rotate-180" : "rotate-0"
                    )} />
                  </>
                )}
              </button>
              <div className={cn(
                "overflow-hidden transition-all duration-300",
                districtsOpen ? "max-h-[600px] opacity-100 mt-1" : "max-h-0 opacity-0"
              )}>
                <div className="space-y-1">
                  <Link
                    to="/admin/tumanlar"
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                      isActive("/admin/tumanlar")
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                        : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
                    )}
                  >
                    <Building2 className="w-4 h-4 shrink-0" />
                    {sidebarOpen && <span className="text-sm font-medium">Barcha tumanlar</span>}
                  </Link>
                  {districts.map((d) => (
                    <Link
                      key={d.id}
                      to={`/admin/tumanlar/${d.code}`}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                        isActive(`/admin/tumanlar/${d.code}`)
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                          : "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
                      )}
                    >
                      <MapPin className="w-4 h-4 shrink-0" />
                      {sidebarOpen && <span className="text-sm font-medium truncate">{d.name}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border space-y-2">
          <Link
            to="/admin/sozlamalar"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
            )}
          >
            <Settings className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-medium">Sozlamalar</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-destructive/10 text-sidebar-foreground/70 hover:text-destructive"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span className="font-medium">Chiqish</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="font-display font-bold text-xl text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {scopeLabel && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                {scopeLabel}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Popover open={notifOpen} onOpenChange={handleNotifOpenChange}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Xabarlar</h3>
                  <p className="text-sm text-muted-foreground">
                    {notifications.length === 0 ? "Hozircha xabar yo'q" : `So'nggi ${notifications.length} ta faoliyat`}
                  </p>
                </div>
                <div className="max-h-80 overflow-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-3 hover:bg-muted/50 border-b border-border last:border-0">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-primary">
                            {n.title.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "SS"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{relativeTime(n.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors cursor-pointer">
                  <span className="text-sm font-semibold text-primary">
                    {(email ?? "SS").slice(0, 2).toUpperCase()}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                {email && <p className="px-3 pb-2 text-xs text-muted-foreground truncate">{email}</p>}
                <Link
                  to="/admin/profil"
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  <UserCog className="w-4 h-4" />
                  <span>Profil sozlamalari</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Chiqish</span>
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;