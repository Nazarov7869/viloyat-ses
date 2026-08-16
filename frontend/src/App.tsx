import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import MainAdmin from "./pages/admin/MainAdmin";
import QabulTolovAdmin from "./pages/admin/QabulTolovAdmin";
import LaboratoryAdmin from "./pages/admin/LaboratoryAdmin";
import SettingsAdmin from "./pages/admin/SettingsAdmin";
import ProfileSettings from "./pages/admin/ProfileSettings";
import RegistrantsAdmin from "./pages/admin/RegistrantsAdmin";
import ViloyatAdmin from "./pages/admin/ViloyatAdmin";
import DistrictsAdmin from "./pages/admin/DistrictsAdmin";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="main">
                <MainAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/main"
            element={
              <ProtectedRoute requiredRole="main">
                <MainAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qabul-tolov"
            element={
              <ProtectedRoute allowedRoles={["main", "qabul", "payment"]}>
                <QabulTolovAdmin />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/qabul" element={<Navigate to="/admin/qabul-tolov" replace />} />
          <Route path="/admin/payment" element={<Navigate to="/admin/qabul-tolov" replace />} />
          <Route
            path="/admin/laborant"
            element={
              <ProtectedRoute allowedRoles={["main", "laborant"]}>
                <LaboratoryAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/laboratoriya/:code"
            element={
              <ProtectedRoute allowedRoles={["main", "qabul", "payment", "laborant", "registrants"]}>
                <LaboratoryAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/sozlamalar"
            element={
              <ProtectedRoute allowedRoles={["main"]}>
                <SettingsAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profil"
            element={
              <ProtectedRoute>
                <ProfileSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/registrants"
            element={
              <ProtectedRoute requiredRole="registrants">
                <RegistrantsAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/viloyat"
            element={
              <ProtectedRoute requiredRole="viloyat">
                <ViloyatAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tumanlar"
            element={
              <ProtectedRoute allowedRoles={["main", "viloyat"]}>
                <DistrictsAdmin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tumanlar/:code"
            element={
              <ProtectedRoute allowedRoles={["main", "viloyat"]}>
                <DistrictsAdmin />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
