import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { apiErrorMessage, tokenStorage } from "@/lib/api";
import { fetchMe, isAuthenticated, login as apiLogin, register as apiRegister } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";
import { logError } from "@/lib/logger";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSignUp, setIsSignUp] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    if (!isAuthenticated()) {
      setIsCheckingAuth(false);
      return;
    }
    redirectBasedOnRole();
  }, []);

  const redirectBasedOnRole = async () => {
    try {
      const me = await fetchMe();
      if (me?.role) {
        localStorage.setItem('adminRole', me.role);
        localStorage.setItem('adminLaboratoryCode', me.laboratory_code ?? '');
        const from =
          me.role === 'laborant' && me.laboratory_code
            ? `/admin/laboratoriya/${me.laboratory_code}`
            : location.state?.from?.pathname || `/admin/${me.role}`;
        navigate(from, { replace: true });
      } else {
        // User has no admin role
        toast({
          title: "Ruxsat yo'q",
          description: "Sizda admin roli mavjud emas",
          variant: "destructive",
        });
        tokenStorage.clear();
        setIsCheckingAuth(false);
      }
    } catch (error) {
      logError("Error during redirect:", error);
      setIsCheckingAuth(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input with zod
    const validationResult = loginSchema.safeParse({ email, password });
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: "Xato",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign up flow
        try {
          await apiRegister(validationResult.data.email, validationResult.data.password);
          toast({
            title: "Muvaffaqiyatli",
            description: "Hisob yaratildi! Endi administrator sizga rol tayinlashi kerak.",
          });
          setIsSignUp(false);
        } catch (error) {
          toast({
            title: "Xato",
            description: apiErrorMessage(error, "Ro'yxatdan o'tishda xatolik"),
            variant: "destructive",
          });
        }
      } else {
        // Login flow
        try {
          const data = await apiLogin(validationResult.data.email, validationResult.data.password);

          if (!data.role) {
            toast({
              title: "Ruxsat yo'q",
              description: "Sizda admin roli mavjud emas. Administrator bilan bog'laning.",
              variant: "destructive",
            });
            tokenStorage.clear();
            return;
          }

          localStorage.setItem('adminRole', data.role);
          localStorage.setItem('adminLaboratoryCode', data.laboratory_code ?? '');

          toast({
            title: "Kirish muvaffaqiyatli",
            description: "Boshqaruv paneliga xush kelibsiz",
          });

          navigate(
            data.role === 'laborant' && data.laboratory_code
              ? `/admin/laboratoriya/${data.laboratory_code}`
              : `/admin/${data.role}`,
            { replace: true },
          );
        } catch (error) {
          toast({
            title: "Xato",
            description: apiErrorMessage(error, "Noto'g'ri elektron pochta yoki parol"),
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      logError("Auth error:", error);
      toast({
        title: "Xato",
        description: "Tizimda xatolik yuz berdi",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-hero">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>
      
      <div className="relative w-full max-w-md animate-scale-in">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Bosh sahifaga qaytish
        </Link>
        
        <Card className="border-border/50 shadow-xl bg-card/95 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center mb-4 shadow-glow">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <CardTitle className="font-display text-2xl">
              {isSignUp ? "Ro'yxatdan o'tish" : "Admin Portal"}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? "Yangi hisob yaratish uchun ma'lumotlarni kiriting" 
                : "Boshqaruv paneliga kirish uchun tizimga kiring"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Elektron pochta</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sanepi.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Parol</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              
              <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isSignUp ? "Yaratilmoqda..." : "Kirish..."}
                  </>
                ) : (
                  isSignUp ? "Hisob yaratish" : "Boshqaruv paneliga kirish"
                )}
              </Button>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-primary hover:underline"
                >
                  {isSignUp 
                    ? "Hisobingiz bormi? Kirish" 
                    : "Hisobingiz yo'qmi? Ro'yxatdan o'tish"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-sm text-sidebar-foreground/50 mt-6">
          Himoyalangan davlat tizimi. Faqat vakolatli xodimlar uchun.
        </p>
      </div>
    </div>
  );
};

export default Login;
