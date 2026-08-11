import { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Microscope,
  Droplets,
  Shield,
  Wallet,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Printer
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import LabWorkloadCard from "@/components/LabWorkloadCard";
import type { AdmissionRow } from "@/components/qabul/types";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--info))",
  "hsl(var(--destructive))",
  "hsl(var(--secondary))"
];

const MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"
];

interface PaidItem {
  service_name: string;
  price: number;
  quantity: number;
  paid_at: string | null;
}

const MainAdmin = () => {
  // Fetch all paid clients for statistics
  const { data: paidClients = [] } = useQuery({
    queryKey: ['paid-clients-stats'],
    queryFn: async () => {
      const { data } = await api.get('/clients/', { params: { payment_status: 'tolangan' } });
      return data ?? [];
    }
  });

  // Real service breakdown from paid (fully or partially) admissions
  const { data: paidItems = [] } = useQuery<PaidItem[]>({
    queryKey: ['paid-admission-items'],
    queryFn: async () => {
      const [paid, partial] = await Promise.all([
        api.get<AdmissionRow[]>('/admissions/', { params: { payment_status: 'tolangan' } }),
        api.get<AdmissionRow[]>('/admissions/', { params: { payment_status: 'qisman' } }),
      ]);
      const admissions = [...(paid.data ?? []), ...(partial.data ?? [])];
      return admissions.flatMap((admission) =>
        admission.admission_items.map((item) => ({
          service_name: item.service_name,
          price: Number(item.price ?? 0),
          quantity: Number(item.quantity ?? 1),
          paid_at: admission.created_at,
        })),
      );
    },
  });

  // Selected date for viewing historical data
  const now = new Date();
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());

  // Generate available years (from 2020 to current year)
  const availableYears = [];
  for (let year = 2020; year <= now.getFullYear(); year++) {
    availableYears.push(year);
  }

  // Days in the selected month
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const availableDays = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);

  // Clamp selectedDay if month changed to shorter month
  const effectiveDay = Math.min(selectedDay, daysInSelectedMonth);

  // Calculate statistics
  const currentDay = now.getDate();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Daily payments (selected day)
  const dailyPayments = paidClients.filter(client => {
    if (!client.payment_date) return false;
    const paymentDate = new Date(client.payment_date);
    return paymentDate.getDate() === effectiveDay 
      && paymentDate.getMonth() === selectedMonth 
      && paymentDate.getFullYear() === selectedYear;
  });


  const dailyTotal = dailyPayments.reduce((sum, client) => sum + (client.payment_amount || 0), 0);

  // Monthly payments (selected month)
  const monthlyPayments = paidClients.filter(client => {
    if (!client.payment_date) return false;
    const paymentDate = new Date(client.payment_date);
    return paymentDate.getMonth() === selectedMonth && paymentDate.getFullYear() === selectedYear;
  });

  const monthlyTotal = monthlyPayments.reduce((sum, client) => sum + (client.payment_amount || 0), 0);

  // Yearly payments (selected year)
  const yearlyPayments = paidClients.filter(client => {
    if (!client.payment_date) return false;
    const paymentDate = new Date(client.payment_date);
    return paymentDate.getFullYear() === selectedYear;
  });

  const yearlyTotal = yearlyPayments.reduce((sum, client) => sum + (client.payment_amount || 0), 0);

  // Total all time
  const totalAllTime = paidClients.reduce((sum, client) => sum + (client.payment_amount || 0), 0);

  // Payments by service type
  const groupItems = (items: PaidItem[]) => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    items.forEach((item) => {
      const prev = map.get(item.service_name) ?? { name: item.service_name, total: 0, count: 0 };
      prev.total += Number(item.price || 0) * Number(item.quantity || 1);
      prev.count += Number(item.quantity || 1);
      map.set(item.service_name, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  };

  const filterItems = (predicate: (d: Date) => boolean) =>
    paidItems.filter((item) => item.paid_at && predicate(new Date(item.paid_at)));

  const paymentsByService = groupItems(paidItems);

  const dailyByService = groupItems(
    filterItems((d) => d.getDate() === effectiveDay && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear),
  );

  const monthlyByService = groupItems(
    filterItems((d) => d.getMonth() === selectedMonth && d.getFullYear() === selectedYear),
  );

  const yearlyByService = groupItems(filterItems((d) => d.getFullYear() === selectedYear));

  // Pie chart data for service distribution
  const pieData = paymentsByService
    .filter(item => item.total > 0)
    .map((item, index) => ({
      ...item,
      color: COLORS[index % COLORS.length]
    }));

  // Navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const isCurrentMonth = selectedMonth === currentMonth && selectedYear === currentYear;
  const isToday = isCurrentMonth && effectiveDay === currentDay;


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + " so'm";
  };

  const handleExportReport = () => {
    const esc = (s: string) =>
      String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const rows = (list: { name: string; total: number; count: number }[]) =>
      list.length
        ? list
            .map(
              (i, n) =>
                `<tr><td>${n + 1}</td><td>${esc(i.name)}</td><td class="c">${i.count}</td><td class="r">${formatCurrency(i.total)}</td></tr>`
            )
            .join("")
        : `<tr><td colspan="4" class="c muted">Ma'lumot yo'q</td></tr>`;
    const section = (
      title: string,
      period: string,
      list: { name: string; total: number; count: number }[],
      total: number,
      clients: number
    ) => `
      <section>
        <h2>${esc(title)} <span class="period">${esc(period)}</span></h2>
        <div class="summary">
          <div><span>Jami summa</span><strong>${formatCurrency(total)}</strong></div>
          <div><span>Mijozlar soni</span><strong>${clients} ta</strong></div>
          <div><span>Analiz turlari</span><strong>${list.length} ta</strong></div>
        </div>
        <table>
          <thead><tr><th>#</th><th>Analiz nomi</th><th class="c">Soni</th><th class="r">Summa</th></tr></thead>
          <tbody>${rows(list)}</tbody>
        </table>
      </section>`;

    const printedAt = new Date().toLocaleString("uz-UZ");
    const html = `<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8">
<title>SES hisoboti — ${effectiveDay}.${selectedMonth + 1}.${selectedYear}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 12px; margin: 0; }
  header { border-bottom: 2px solid #0f766e; padding-bottom: 10px; margin-bottom: 16px; }
  header h1 { font-size: 18px; margin: 0 0 4px; color: #0f766e; }
  header p { margin: 0; color: #555; font-size: 11px; }
  section { margin-bottom: 20px; page-break-inside: avoid; }
  h2 { font-size: 14px; margin: 0 0 8px; border-left: 4px solid #0f766e; padding-left: 8px; }
  .period { font-weight: normal; color: #666; font-size: 11px; }
  .summary { display: flex; gap: 10px; margin-bottom: 8px; }
  .summary div { flex: 1; border: 1px solid #ddd; border-radius: 4px; padding: 6px 8px; }
  .summary span { display: block; color: #666; font-size: 10px; }
  .summary strong { font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 5px 6px; }
  th { background: #f0fdfa; text-align: left; font-size: 11px; }
  td.r, th.r { text-align: right; }
  td.c, th.c { text-align: center; }
  .muted { color: #888; }
  footer { margin-top: 18px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 10px; color: #666; display: flex; justify-content: space-between; }
</style></head><body>
<header>
  <h1>Jizzax viloyati SES markazi — Moliyaviy hisobot</h1>
  <p>Hisobot davri: ${effectiveDay}-${MONTHS[selectedMonth]} ${selectedYear} y. | Chop etilgan sana: ${esc(printedAt)}</p>
</header>
${section("Kunlik hisobot", `${effectiveDay}-${MONTHS[selectedMonth]} ${selectedYear}`, dailyByService, dailyTotal, dailyPayments.length)}
${section("Oylik hisobot", `${MONTHS[selectedMonth]} ${selectedYear}`, monthlyByService, monthlyTotal, monthlyPayments.length)}
${section("Yillik hisobot", `${selectedYear} yil`, yearlyByService, yearlyTotal, yearlyPayments.length)}
<footer><span>Jami (barcha davr): ${formatCurrency(totalAllTime)}</span><span>Imzo: _______________</span></footer>
</body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const stats = [
    { 
      label: "Kunlik to'lov", 
      value: formatCurrency(dailyTotal), 
      subtext: `${dailyPayments.length} ta mijoz`,
      icon: Clock,
      color: "destructive"
    },
    { 
      label: "Oylik to'lov", 
      value: formatCurrency(monthlyTotal), 
      subtext: `${monthlyPayments.length} ta mijoz`,
      icon: Calendar,
      color: "primary"
    },
    { 
      label: "Yillik to'lov", 
      value: formatCurrency(yearlyTotal), 
      subtext: `${yearlyPayments.length} ta mijoz`,
      icon: CalendarDays,
      color: "success"
    },
    { 
      label: "Jami to'lov", 
      value: formatCurrency(totalAllTime), 
      subtext: `${paidClients.length} ta mijoz`,
      icon: Wallet,
      color: "info"
    },
  ];

  return (
    <AdminLayout title="Bosh panel" subtitle="Tizim statistikasi va boshqaruvi">
      <div className="space-y-6">
        {/* Month/Year Selector */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Hisobot davri:</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {/* Day selector */}
                <Select
                  value={effectiveDay.toString()}
                  onValueChange={(value) => setSelectedDay(parseInt(value))}
                >
                  <SelectTrigger className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDays.map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Month selector */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Select 
                    value={selectedMonth.toString()} 
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={goToNextMonth}
                    disabled={isCurrentMonth}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Year selector */}
                <Select 
                  value={selectedYear.toString()} 
                  onValueChange={(value) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Reset to today */}
                {!isToday && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => {
                      setSelectedDay(currentDay);
                      setSelectedMonth(currentMonth);
                      setSelectedYear(currentYear);
                    }}
                  >
                    Bugun
                  </Button>
                )}

                <Button size="sm" onClick={handleExportReport} className="gap-2">
                  <Printer className="h-4 w-4" />
                  Eksport / Chop etish
                </Button>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={stat.label} className="relative overflow-hidden animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    stat.color === 'primary' ? 'bg-primary/10' :
                    stat.color === 'info' ? 'bg-info/10' :
                    stat.color === 'destructive' ? 'bg-destructive/10' : 'bg-success/10'
                  }`}>
                    <stat.icon className={`w-6 h-6 ${
                      stat.color === 'primary' ? 'text-primary' :
                      stat.color === 'info' ? 'text-info' :
                      stat.color === 'destructive' ? 'text-destructive' : 'text-success'
                    }`} />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtext}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Service Type Payments */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Daily by Service */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Kunlik xizmat turlari bo'yicha</CardTitle>
              <CardDescription>{effectiveDay} {MONTHS[selectedMonth]} {selectedYear} - to'lovlar va mijozlar soni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dailyByService.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium truncate max-w-[140px]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground block">{formatCurrency(item.total)}</span>
                      <span className="text-xs text-muted-foreground">{item.count} kishi</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <span className="text-sm font-bold">Jami kunlik</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-destructive">{formatCurrency(dailyTotal)}</span>
                    <span className="text-xs text-muted-foreground block">{dailyPayments.length} kishi</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly by Service */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Oylik xizmat turlari bo'yicha</CardTitle>
              <CardDescription>{MONTHS[selectedMonth]} {selectedYear} - to'lovlar</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyByService.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium truncate max-w-[140px]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground block">{formatCurrency(item.total)}</span>
                      <span className="text-xs text-muted-foreground">{item.count} kishi</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-sm font-bold">Jami oylik</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-primary">{formatCurrency(monthlyTotal)}</span>
                    <span className="text-xs text-muted-foreground block">{monthlyPayments.length} kishi</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Yearly by Service */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Yillik xizmat turlari bo'yicha</CardTitle>
              <CardDescription>{selectedYear}-yil to'lovlari</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {yearlyByService.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium truncate max-w-[140px]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground block">{formatCurrency(item.total)}</span>
                      <span className="text-xs text-muted-foreground">{item.count} kishi</span>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between p-3 rounded-lg bg-success/10 border border-success/20">
                  <span className="text-sm font-bold">Jami yillik</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-success">{formatCurrency(yearlyTotal)}</span>
                    <span className="text-xs text-muted-foreground block">{yearlyPayments.length} kishi</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Time Service Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Umumiy xizmat statistikasi</CardTitle>
            <CardDescription>Barcha vaqt davomidagi to'lovlar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentsByService.map((item, index) => (
                <div 
                  key={item.name} 
                  className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm font-medium text-muted-foreground truncate">{item.name}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(item.total)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.count} ta mijoz</p>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-success/10 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Jami umumiy to'lov</p>
                  <p className="text-3xl font-display font-bold text-foreground">{formatCurrency(totalAllTime)}</p>
                </div>
                <Wallet className="w-12 h-12 text-primary/50" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart for Service Distribution */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">To'lovlar taqsimoti</CardTitle>
              <CardDescription>Xizmat turlari bo'yicha foizli ko'rinish</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                {pieData.map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs text-muted-foreground">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <LabWorkloadCard />
      </div>
    </AdminLayout>
  );
};

export default MainAdmin;
