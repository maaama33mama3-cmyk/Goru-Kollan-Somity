import React, { useEffect, useState, useRef } from 'react';
import { dbService, Member, Payment } from '../services/dbService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function Payments() {
  const { isAdmin, currentUser } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState(format(new Date(), 'yyyy-MM'));

  // Add flow
  const [addOpen, setAddOpen] = useState(false);
  const [memId, setMemId] = useState('');
  const [amount, setAmount] = useState('500');
  const [method, setMethod] = useState<'bKash' | 'Nagad' | 'Bank' | 'Cash'>('bKash');
  const [fundType, setFundType] = useState('মাসিক চাঁদা');
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);

  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [filterMonth]);

  async function loadData() {
    setLoading(true);
    const p = await dbService.getPayments(false, filterMonth);
    const m = await dbService.getMembers();
    const s = await dbService.getSettings();
    setPayments(p);
    setMembers(m);
    setSettings(s);
    setLoading(false);
  }

  const handleMemberSelect = (val: string) => {
    setMemId(val);
    const member = members.find(m => m.id === val);
    if (member) {
      // Amount is calculated as shares * shareValue (fallback to 250 if not found)
      const shares = member.shares || 1;
      const valPerShare = settings?.shareValue || 250;
      setAmount((shares * valPerShare).toString());
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memId || !amount || !method || !month) return;
    await dbService.addPayment({
      memberId: memId,
      amount: Number(amount),
      method,
      month,
      fundType,
      date: new Date().toISOString(),
      addedBy: currentUser?.email || 'unknown'
    });
    setAddOpen(false);
    loadData();
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown';

  const handleDownloadClick = () => {
    setDownloadConfirmOpen(true);
  };

  const downloadSlip = async () => {
    setDownloadConfirmOpen(false);
    if (!slipRef.current) return;
    try {
      const dataUrl = await toPng(slipRef.current, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      // Get natural dimensions from image to preserve ratio
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => img.onload = resolve);
      
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Monthly-Slip-${filterMonth}.pdf`);
    } catch (error) {
      console.error("Error generating slip:", error);
      alert("স্লিপ ডাউনলোড করতে সমস্যা হয়েছে।");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">চাঁদা আদায় (Income)</h2>
          <p className="text-text-muted">মাসিক চাঁদা কালেকশন রিপোর্ট এবং এন্ট্রি</p>
        </div>
        <div className="flex items-center gap-2">
          <Input 
            type="month" 
            value={filterMonth} 
            onChange={(e) => setFilterMonth(e.target.value)} 
            className="w-40"
          />
          <Button variant="outline" onClick={handleDownloadClick}>
            <Download className="mr-2 h-4 w-4" /> স্লিপ ডাউনলোড
          </Button>
          {isAdmin && (
            <Button onClick={() => setAddOpen(true)}>+ চাঁদা এন্ট্রি</Button>
          )}
        </div>
      </div>

      {/* Slip Container to Print */}
      <div className="theme-card" ref={slipRef}>
        <div className="p-6 border-b border-border text-center bg-app-bg">
          <h2 className="text-xl font-bold text-primary">গরু কল্যাণ সমিতি - মাসিক সংগ্রহ স্লিপ</h2>
          <p className="text-sm text-text-muted mt-1">মাস: {format(new Date(filterMonth + '-01'), 'MMMM yyyy')}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>সদস্যের নাম</TableHead>
              <TableHead>তারিখ</TableHead>
              <TableHead>ফান্ড</TableHead>
              <TableHead>মাধ্যম</TableHead>
              <TableHead className="text-right">পরিমান (৳)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : payments.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-muted">এই মাসে কোনো চাঁদা জমা হয়নি</TableCell></TableRow>
            ) : payments.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{getMemberName(p.memberId)}</TableCell>
                <TableCell>{format(new Date(p.date), 'dd/MM/yy')}</TableCell>
                <TableCell>
                   <span className="text-xs font-medium px-2 py-1 rounded" style={{ backgroundColor: '#f4f4f5', color: '#52525b' }}>
                     {p.fundType || 'মাসিক চাঁদা'}
                   </span>
                </TableCell>
                <TableCell>
                  <span className="bg-primary-light text-primary px-2 py-1 rounded text-xs font-semibold">
                    {p.method}
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold text-primary">৳ {p.amount}</TableCell>
              </TableRow>
            ))}
            {!loading && payments.length > 0 && (
              <TableRow className="bg-app-bg border-t border-border">
                <TableCell colSpan={4} className="text-right font-bold text-text-dark">মোট সংগ্রহ:</TableCell>
                <TableCell className="text-right font-bold text-lg text-primary">
                  ৳ {payments.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>নতুন চাঁদা এন্ট্রি</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>সদস্য নির্বাচন করুন</Label>
              <Select value={memId} onValueChange={handleMemberSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="সদস্য নির্বাচন করুন">
                    {memId ? members.find(m => m.id === memId)?.name : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>পরিমান (৳)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>মাধ্যম</Label>
                <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                  <SelectTrigger><SelectValue placeholder="মাধ্যম" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bKash">bKash</SelectItem>
                    <SelectItem value="Nagad">Nagad</SelectItem>
                    <SelectItem value="Bank">Bank Account</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ফান্ড (Category)</Label>
                <Select value={fundType} onValueChange={(v: any) => setFundType(v)}>
                  <SelectTrigger><SelectValue placeholder="ফান্ড" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="মাসিক চাঁদা">মাসিক চাঁদা (Regular)</SelectItem>
                    <SelectItem value="জরুরি ফান্ড">জরুরি ফান্ড (Emergency)</SelectItem>
                    <SelectItem value="অনুদান">অনুদান (Donation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>কোন মাসের চাঁদা?</Label>
                <Input type="month" value={month} onChange={e => setMonth(e.target.value)} />
              </div>
            </div>

            <Button type="submit" className="w-full mt-4">জমা দিন</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Download Confirm Dialog */}
      <Dialog open={downloadConfirmOpen} onOpenChange={setDownloadConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ডাউনলোড কনফার্মেশন</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>আপনি কি এই মাসের চাঁদার স্লিপটি পিডিএফ (PDF) হিসেবে ডাউনলোড করতে চান?</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDownloadConfirmOpen(false)}>বাতিল করুন</Button>
            <Button onClick={downloadSlip}>হ্যাঁ, ডাউনলোড করুন</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
