import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api, { apiErrorMessage } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter,
  MapPin,
  Calendar,
  FileCheck,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  User,
  Stethoscope,
  Briefcase,
  DollarSign,
  Clock
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  birth_year: string;
  address: string;
  workplace: string;
  service_type: string;
  status: string;
  payment_status: string;
  payment_amount: number | null;
  payment_date: string | null;
  registered_at: string;
}

const RegistrantsAdmin = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data } = await api.get<Client[]>('/clients/', { params: { payment_status: 'tolangan' } });
      setClients(data ?? []);
    } catch (error) {
      toast({
        title: "Xatolik",
        description: apiErrorMessage(error, "Ma'lumotlarni yuklashda xatolik yuz berdi"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (clientId: string) => {
    try {
      await api.patch(`/clients/${clientId}/`, { status: 'tugatildi' });

      toast({
        title: "Muvaffaqiyatli",
        description: "Mijoz holati yangilandi",
      });

      fetchClients();
    } catch (error) {
      toast({
        title: "Xatolik",
        description: apiErrorMessage(error, "Holatni yangilashda xatolik yuz berdi"),
        variant: "destructive",
      });
    }
  };

  const filteredClients = clients.filter(client => {
    const search = searchTerm.toLowerCase();
    return (
      client.first_name.toLowerCase().includes(search) ||
      client.last_name.toLowerCase().includes(search) ||
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(search) ||
      client.service_type.toLowerCase().includes(search) ||
      client.address.toLowerCase().includes(search) ||
      client.workplace.toLowerCase().includes(search)
    );
  });

  // Count by service type for chart
  const serviceTypeCounts = clients.reduce((acc, client) => {
    const type = client.service_type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const registrationData = Object.entries(serviceTypeCounts).map(([category, count]) => ({
    category: category.length > 20 ? category.substring(0, 20) + '...' : category,
    count
  }));

  const completedCount = clients.filter(c => c.status === 'tugatildi').length;
  const inProgressCount = clients.filter(c => c.status === 'ko\'rildi').length;

  const stats = [
    { 
      label: "Jami ro'yxatdan o'tganlar", 
      value: clients.length.toString(), 
      change: "+12", 
      trend: "up",
      icon: Users,
      color: "primary"
    },
    { 
      label: "Jarayonda", 
      value: inProgressCount.toString(), 
      change: "ta", 
      trend: "up",
      icon: Clock,
      color: "warning"
    },
    { 
      label: "Tugatilgan", 
      value: completedCount.toString(), 
      change: "ta", 
      trend: "up",
      icon: CheckCircle2,
      color: "success"
    },
    { 
      label: "Jami to'lovlar", 
      value: `${clients.reduce((sum, c) => sum + (c.payment_amount || 0), 0).toLocaleString()} so'm`, 
      change: "+15%", 
      trend: "up",
      icon: DollarSign,
      color: "info"
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "tugatildi":
        return <Badge className="bg-success/10 text-success hover:bg-success/20 border-0"><CheckCircle2 className="w-3 h-3 mr-1" /> Tugatildi</Badge>;
      case "ko'rildi":
        return <Badge className="bg-info/10 text-info hover:bg-info/20 border-0"><Eye className="w-3 h-3 mr-1" /> Ko'rildi</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning hover:bg-warning/20 border-0"><AlertCircle className="w-3 h-3 mr-1" /> Yangi</Badge>;
    }
  };

  return (
    <AdminLayout title="Ro'yxatdan o'tganlar" subtitle="To'lov qilingan va ro'yxatdan o'tgan mijozlar">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={stat.label} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    stat.color === 'primary' ? 'bg-primary/10' :
                    stat.color === 'success' ? 'bg-success/10' :
                    stat.color === 'info' ? 'bg-info/10' : 'bg-warning/10'
                  }`}>
                    <stat.icon className={`w-6 h-6 ${
                      stat.color === 'primary' ? 'text-primary' :
                      stat.color === 'success' ? 'text-success' :
                      stat.color === 'info' ? 'text-info' : 'text-warning'
                    }`} />
                  </div>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-success' : 'text-destructive'
                  }`}>
                    {stat.trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Registration by Category */}
        {registrationData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Xizmat turlari bo'yicha</CardTitle>
              <CardDescription>Ro'yxatdan o'tgan mijozlar taqsimoti</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={registrationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="category" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={150} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Registrants List */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="font-display">Ro'yxatdan o'tgan mijozlar</CardTitle>
              <CardDescription>To'lov qilingan va tasdiqlangan mijozlar</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Mijozlarni qidirish..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Yuklanmoqda...</div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Ro'yxatdan o'tgan mijozlar yo'q
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClients.map((client, index) => (
                  <div 
                    key={client.id}
                    className="p-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-all animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-foreground">
                            {client.first_name} {client.last_name}
                          </span>
                          {getStatusBadge(client.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Stethoscope className="w-3 h-3" />
                            {client.service_type}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {client.address}
                          </span>
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-3 h-3" />
                            {client.workplace}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            To'langan: {(client.payment_amount || 0).toLocaleString()} so'm
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {client.payment_date ? new Date(client.payment_date).toLocaleDateString('uz-UZ') : '-'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {client.status !== 'tugatildi' && (
                          <Button 
                            onClick={() => handleComplete(client.id)}
                            variant="outline"
                            className="border-success text-success hover:bg-success/10"
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Tugatish
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setSelectedClient(client)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Mijoz ma'lumotlari</DialogTitle>
            <DialogDescription>To'lov va ro'yxat ma'lumotlari</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">F.I.Sh.</p>
                  <p className="font-medium">{selectedClient.first_name} {selectedClient.last_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tug'ilgan yil</p>
                  <p className="font-medium">{selectedClient.birth_year}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Manzil</p>
                  <p className="font-medium">{selectedClient.address}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Ish joyi</p>
                  <p className="font-medium">{selectedClient.workplace}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">Xizmat turi</p>
                  <p className="font-medium">{selectedClient.service_type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">To'lov summasi</p>
                  <p className="font-medium">{(selectedClient.payment_amount || 0).toLocaleString()} so'm</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">To'lov sanasi</p>
                  <p className="font-medium">{selectedClient.payment_date ? new Date(selectedClient.payment_date).toLocaleDateString('uz-UZ') : '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Holat</p>
                  <div className="mt-1">{getStatusBadge(selectedClient.status)}</div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default RegistrantsAdmin;