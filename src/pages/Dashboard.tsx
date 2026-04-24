import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dbService, Payment, Expense, Member, Settings } from '../services/dbService';
import { useAuth } from '../contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Settings as SettingsIcon, Wallet, TrendingUp, PieChart as PieChartIcon, Users, DownloadCloud, AlertCircle, Landmark } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { downloadOrShareFile } from '../lib/downloadHelper';

const COLORS = ['#10b981', '#059669', '#f59e0b', '#ef4444'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { isAdmin, currentMember } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [settings, setSettings] = useState<Settings>({ yearlyTarget: 100000, shareValue: 250 });
  const [loading, setLoading] = useState(true);

  // Settings edit flow
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editTarget, setEditTarget] = useState('');
  const [editShareValue, setEditShareValue] = useState('');
  const [editAdminEmails, setEditAdminEmails] = useState('');
  
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentMember, isAdmin]);

  async function loadData() {
    setLoading(true);
    try {
      // Members only need to load their own payments usually, but since Firestore limits aren't set for memberIds 
      // we might get blocked. We wrap in try..catch and just load what we can.
      const p = await dbService.getPayments(true).catch(e => { console.error(e); return []; });
      const m = await dbService.getMembers(true).catch(e => { console.error(e); return currentMember ? [currentMember] : []; });
      setPayments(p);
      setMembers(m);
      
      if (isAdmin) {
        const e = await dbService.getExpenses().catch(e => { console.error(e); return []; });
        const l = await dbService.getLoans().catch(e => { console.error(e); return []; });
        setExpenses(e);
        setLoans(l);
      }
      
      const s = await dbService.getSettings().catch(e => { console.error(e); return { yearlyTarget: 100000, shareValue: 250, adminEmails: [] } as Settings; });
      setSettings(s as Settings);
      setEditTarget(s.yearlyTarget?.toString() || '100000');
      setEditShareValue(s.shareValue?.toString() || '250');
      setEditAdminEmails(s.adminEmails ? s.adminEmails.join(', ') : '');
    } catch (e) {
      console.error("Dashboard Load Error: ", e);
    }
    setLoading(false);
  }

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editShareValue) return;
    
    // Parse emails
    let emails: string[] = [];
    if (editAdminEmails) {
       emails = editAdminEmails.split(',').map(m => m.trim().toLowerCase()).filter(m => m.length > 0);
    }
    
    await dbService.saveSettings({
       ...settings,
       yearlyTarget: Number(editTarget),
       shareValue: Number(editShareValue),
       adminEmails: emails
    });
    setSettingsOpen(false);
    loadData();
  };

  const handleExportExcel = async () => {
    if (!isAdmin) {
      alert("দুঃখিত, শুধুমাত্র অ্যাডমিনরা ব্যাকআপ ডাউনলোড করতে পারবেন।");
      return;
    }

    const wb = XLSX.utils.book_new();

    // 1. Members Sheet
    let grandTotalPaid = 0;
    const membersData: any[] = members.map(m => {
      const memberPayments = payments.filter(p => p.memberId === m.id);
      const memberTotal = memberPayments.reduce((acc, curr) => acc + curr.amount, 0);
      grandTotalPaid += memberTotal;

      return {
        'নাম': m.name,
        'মোবাইল নম্বর': m.phone,
        'লগইন আইডি': m.memberId || '',
        'লগইন পাসওয়ার্ড (PIN)': m.pin || '',
        'শেয়ার সংখ্যা': m.shares || 1,
        'মোট জমা (৳)': memberTotal,
        'যোগদানের তারিখ': m.joiningDate,
        'স্ট্যাটাস': m.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'
      };
    });

    // Add a summary row at the end
    membersData.push({
      'নাম': 'সর্বমোট',
      'মোবাইল নম্বর': '',
      'লগইন আইডি': '',
      'লগইন পাসওয়ার্ড (PIN)': '',
      'শেয়ার সংখ্যা': '',
      'মোট জমা (৳)': grandTotalPaid,
      'যোগদানের তারিখ': '',
      'স্ট্যাটাস': ''
    });

    const wsMembers = XLSX.utils.json_to_sheet(membersData);
    XLSX.utils.book_append_sheet(wb, wsMembers, "সদস্য তালিকা");

    // 2. Payments Sheet
    const paymentsData = payments.map(p => {
      const member = members.find(m => m.id === p.memberId);
      return {
        'সদস্যের নাম': member?.name || 'অজ্ঞাত',
        'পরিমান (৳)': p.amount,
        'মাধ্যম': p.method,
        'মাস': p.month,
        'তারিখ': format(new Date(p.date), 'yyyy-MM-dd')
      };
    });
    const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
    XLSX.utils.book_append_sheet(wb, wsPayments, "চাঁদা জমা");

    // 3. Expenses Sheet
    const expensesData = expenses.map(e => ({
      'খাতের নাম': e.category,
      'পরিমান (৳)': e.amount,
      'বর্ণনা': e.description,
      'তারিখ': format(new Date(e.date), 'yyyy-MM-dd')
    }));
    const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(wb, wsExpenses, "খরচের হিসাব");

    // Get loans directly
    const loans = await dbService.getLoans();
    const loansData = loans.map(l => {
      const member = members.find(m => m.id === l.memberId);
      return {
        'সদস্যের নাম': member?.name || 'অজ্ঞাত',
        'পরিমান (৳)': l.amount,
        'স্ট্যাটাস': l.status === 'active' ? 'চলমান' : 'পরিশোধিত',
        'তারিখ': format(new Date(l.issueDate), 'yyyy-MM-dd')
      };
    });
    const wsLoans = XLSX.utils.json_to_sheet(loansData);
    XLSX.utils.book_append_sheet(wb, wsLoans, "কর্জ বা লোন");

    // Save
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await downloadOrShareFile(blob, `GKS_Backup_${format(new Date(), 'yyyy-MM-dd')}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  if (currentMember && !isAdmin) {
    const myPayments = payments.filter(p => p.memberId === currentMember.id);
    const totalPaid = myPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const shareCount = currentMember.shares || 1;
    // Assuming each share is due the shareValue * number of months (naive calculation, simplified)
    // Here we'll just show what they paid and their ledger points.
    
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">আমার খতিয়ান (My Ledger)</h2>
        <Card className="theme-card border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle>{currentMember.name}</CardTitle>
            <CardDescription>{currentMember.phone} | শেয়ার: {shareCount}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary-light p-4 rounded-xl border border-primary/20">
                <p className="text-sm text-text-muted font-medium mb-1">সর্বমোট জমা</p>
                <p className="text-2xl font-bold text-primary">৳ {totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-app-bg p-4 rounded-xl shadow-inner border border-border">
                <p className="text-sm text-text-muted font-medium mb-1">স্ট্যাটাস</p>
                <p className={`text-lg font-bold ${currentMember.status === 'active' ? 'text-primary' : 'text-danger'}`}>
                  {currentMember.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </p>
              </div>
            </div>

            <h3 className="font-bold text-lg mt-8 mb-4 border-b pb-2">জমার বিবরণী</h3>
            {myPayments.length > 0 ? (
              <div className="space-y-3">
                {myPayments.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 sm:p-4 rounded-lg bg-card border shadow-sm">
                    <div>
                      <p className="font-semibold text-text-dark">{p.month}</p>
                      <p className="text-xs text-text-muted mt-0.5">{p.method} • {format(parseISO(p.date), 'dd MMM yyyy')}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">৳ {p.amount}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-text-muted">আপনার কোনো জমার রেকর্ড পাওয়া যায়নি।</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalIncome = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const activeLoans = loans.filter(l => l.status === 'active').reduce((acc, curr) => acc + curr.amount, 0);
  const cashInHand = totalIncome - totalExpense - activeLoans;
  const progressPercent = Math.min((totalIncome / settings.yearlyTarget) * 100, 100);

  // Group by month for line chart
  const monthlyDataMap = new Map<string, number>();
  payments.forEach(p => {
    monthlyDataMap.set(p.month, (monthlyDataMap.get(p.month) || 0) + p.amount);
  });
  const lineData = Array.from(monthlyDataMap.entries())
    .map(([month, amount]) => ({ name: month, amount }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Pie chart by method
  const methodMap = new Map<string, number>();
  payments.forEach(p => {
    methodMap.set(p.method, (methodMap.get(p.method) || 0) + p.amount);
  });
  const pieData = Array.from(methodMap.entries()).map(([name, value]) => ({ name, value }));

  // Due calculation for current month
  const currentMonth = format(new Date(), 'yyyy-MM');
  const paidMemberIds = new Set(payments.filter(p => p.month === currentMonth).map(p => p.memberId));
  const dueMembers = members.filter(m => m.status === 'active' && !paidMemberIds.has(m.id));
  const currentMonthDue = dueMembers.length * settings.shareValue;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">ড্যাশবোর্ড</h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">এক নজরে সমিতির সার্বিক অবস্থা</p>
        </div>
        {isAdmin && (
          <Button 
            variant="outline" 
            size="sm"
            className="border-primary/50 text-primary hover:bg-primary/5 shrink-0"
            onClick={() => setExportConfirmOpen(true)}
          >
            <DownloadCloud className="mr-1.5 h-4 w-4" />
            <span className="text-xs sm:text-sm">এক্সেল ব্যাকআপ</span>
          </Button>
        )}
      </div>

      <Card className="theme-gradient text-white border-none shadow-md">
        <CardContent className="p-5">
          <div className="mb-3 flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-medium opacity-90">বার্ষিক টার্গেট প্রগ্রেস</p>
                {isAdmin && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-white hover:bg-white/20 hover:text-white rounded-full p-1 border-white/30 border"
                    onClick={() => {
                        setEditTarget(settings.yearlyTarget.toString());
                        setEditShareValue(settings.shareValue.toString());
                        setEditAdminEmails(settings.adminEmails ? settings.adminEmails.join(', ') : '');
                        setSettingsOpen(true);
                    }}
                    title="সেটিংস পরিবর্তন করুন"
                  >
                     <SettingsIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <h3 className="text-xl font-bold mt-1">৳ {totalIncome.toLocaleString()} <span className="opacity-70 text-sm font-normal">/ ৳ {settings.yearlyTarget.toLocaleString()}</span></h3>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold">{progressPercent.toFixed(1)}%</span>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2 bg-white/20" indicatorClassName="bg-white" />
        </CardContent>
      </Card>

      <Dialog open={exportConfirmOpen} onOpenChange={setExportConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ডাউনলোড পারমিশন</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-text-muted">আপনি কি নিশ্চিত যে আপনি সমিতির সমস্ত ডাটা ও হিসাব এক্সেল ফাইলে ডাউনলোড করতে চান? এই ফাইলে সকল সংবেদনশীল তথ্য থাকবে।</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setExportConfirmOpen(false)}>বাতিল</Button>
            <Button onClick={() => {
              setExportConfirmOpen(false);
              handleExportExcel();
            }}>হ্যাঁ, ডাউনলোড করুন</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ড্যাশবোর্ড ও অ্যাপ সেটিংস</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSettingsSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>বার্ষিক টার্গেট পরিমাণ (৳)</Label>
              <Input type="number" value={editTarget} onChange={e => setEditTarget(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>১টি শেয়ারের মূল্য (৳)</Label>
              <Input type="number" value={editShareValue} onChange={e => setEditShareValue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>অ্যাডমিন ইমেইল (একাধিক হলে কমা দিয়ে লিখুন)</Label>
              <Input type="text" value={editAdminEmails} onChange={e => setEditAdminEmails(e.target.value)} placeholder="example@gmail.com, admin@gmail.com" />
              <p className="text-xs text-text-muted mt-1">যাদের ইমেইল এখানে থাকবে তারা গুগলের মাধ্যমে লগইন করে অ্যাডমিন কন্ট্রোল পাবে।</p>
            </div>
            <Button type="submit" className="w-full">সেভ করুন</Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* বর্তমান ব্যালেন্স */}
        <Card className="theme-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-3 sm:mb-4 border border-emerald-200">
              <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-[12px] sm:text-[13px] font-medium text-text-muted mb-1">বর্তমান ব্যালেন্স</p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-dark">৳ {cashInHand.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        {/* মোট জমা */}
        <Card className="theme-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-3 sm:mb-4 border border-indigo-200">
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[12px] sm:text-[13px] font-medium text-text-muted mb-1">সর্বমোট জমা</p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-dark">৳ {totalIncome.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        {/* মোট সদস্য */}
        <Card 
          className="theme-card shadow-sm hover:shadow-md transition-shadow cursor-pointer border-amber-200/50 hover:border-amber-400"
          onClick={() => navigate('/members')}
        >
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-amber-100 flex items-center justify-center mb-3 sm:mb-4 border border-amber-200">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-[12px] sm:text-[13px] font-medium text-text-muted mb-1 flex items-center">
                মোট সদস্য <span className="ml-1 text-[10px] text-amber-500 font-semibold">(View &rarr;)</span>
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-dark">{members.length} <span className="text-sm font-normal text-text-muted font-sans">জন</span></h3>
            </div>
          </CardContent>
        </Card>

        {/* বর্তমান বকেয়া */}
        <Card className="theme-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-3 sm:mb-4 border border-orange-200">
              <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-[12px] sm:text-[13px] font-medium text-text-muted mb-1">চলতি বকেয়া ({currentMonth})</p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-dark">৳ {currentMonthDue.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        {/* মোট খরচ */}
        <Card className="theme-card shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-rose-100 flex items-center justify-center mb-3 sm:mb-4 border border-rose-200">
              <PieChartIcon className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" />
            </div>
            <div>
              <p className="text-[12px] sm:text-[13px] font-medium text-text-muted mb-1">সর্বমোট খরচ</p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-dark">৳ {totalExpense.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>

        {/* মোট কর্জ/লোন */}
        <Card 
          className="theme-card shadow-sm hover:shadow-md transition-shadow cursor-pointer border-cyan-200/50 hover:border-cyan-400"
          onClick={() => navigate('/loans')}
        >
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-cyan-100 flex items-center justify-center mb-3 sm:mb-4 border border-cyan-200">
              <Landmark className="h-5 w-5 sm:h-6 sm:w-6 text-cyan-600" />
            </div>
            <div>
              <p className="text-[12px] sm:text-[13px] font-medium text-text-muted mb-1 flex items-center">
                চলমান লোন <span className="ml-1 text-[10px] text-cyan-500 font-semibold">(View &rarr;)</span>
              </p>
              <h3 className="text-xl sm:text-2xl font-bold text-text-dark">৳ {activeLoans.toLocaleString()}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="theme-card">
          <CardHeader>
            <CardTitle className="text-lg">মাসিক কালেকশন</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
                <RechartsTooltip cursor={{stroke: '#e5e7eb', strokeWidth: 2}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="amount" name="সংগৃহীত চাঁদা" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-primary)' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="theme-card">
          <CardHeader>
            <CardTitle className="text-lg">পেমেন্ট মাধ্যম</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 60, bottom: 20, left: 60 }}>
                  <Pie 
                    data={pieData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={40} 
                    outerRadius={65} 
                    fill="#8884d8" 
                    paddingAngle={5} 
                    dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name, percent }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 20;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="#6b7280" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight={500}>
                          {`${name} ${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
                <div style={{ color: '#71717a' }}>কোনো ডাটা নেই</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#fffbeb] border-[#fde68a] shadow-sm">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="bg-warning w-2 h-2 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <h4 className="text-[13px] font-bold text-[#92400e]">
              {dueMembers.length} জন সদস্যের চাঁদা বকেয়া আছে ({currentMonth})
            </h4>
            {dueMembers.length > 0 && (
              <div className="text-sm mt-2 text-[#92400e] flex flex-wrap gap-2">
                {dueMembers.map(m => (
                   <a 
                      key={m.id} 
                      href={`https://wa.me/${m.phone.replace(/^0/, '+880')}?text=${encodeURIComponent(`আসসালামু আলাইকুম ${m.name},\nদয়া করে আপনার চলতি মাসের (${currentMonth}) চাঁদাটি দ্রুত পরিশোধ করার অনুরোধ করা হলো।\n- গরু কল্যাণ সমিতি`)}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="bg-white/50 px-3 py-1 rounded-full border border-[#fde68a] hover:bg-white transition-colors flex items-center gap-1 font-medium"
                   >
                     {m.name} <span className="opacity-60 text-xs">(Reminder)</span>
                   </a>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
