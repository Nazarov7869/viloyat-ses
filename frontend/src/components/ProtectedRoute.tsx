import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { fetchMe, isAuthenticated } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { logError } from "@/lib/logger";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "main" | "qabul" | "payment" | "registrants" | "viloyat";
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, requiredRole, allowedRoles }: ProtectedRouteProps) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!isAuthenticated()) {
        if (active) {
          setAuthenticated(false);
          setLoading(false);
        }
        return;
      }
      try {
        const me = await fetchMe();
        if (!active) return;
        setAuthenticated(!!me);
        setUserRole(me?.role ?? null);
      } catch (error) {
        logError("Error fetching user role:", error);
        if (active) {
          setAuthenticated(false);
          setUserRole(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Authenticated but no admin role - redirect to home
  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  // Viloyat nazoratchisi faqat viloyat panelini ko'radi — universal sahifalar
  // (requiredRole/allowedRoles berilmagan, masalan profil sozlamalari) bundan mustasno
  const isRoleRestricted = !!requiredRole || !!allowedRoles;
  if (userRole === "viloyat" && isRoleRestricted && requiredRole !== "viloyat" && !allowedRoles?.includes("viloyat")) {
    return <Navigate to="/admin/viloyat" replace />;
  }

  // Bir nechta rolga ruxsat berilgan sahifalar
  if (allowedRoles && !allowedRoles.includes(userRole) && userRole !== "main") {
    return <Navigate to="/admin/qabul-tolov" replace />;
  }

  // Check if user has the required role (main admin can access everything)
  if (requiredRole && userRole !== requiredRole && userRole !== "main") {
    return <Navigate to={`/admin/${userRole}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
