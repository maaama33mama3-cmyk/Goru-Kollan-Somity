import React, { useEffect, useState, useRef } from 'react';
import { dbService, Payment, Expense, Loan, Member } from '../services/dbService';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

export default function Reports() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadConfirmOpen, setDownloadConfirmOpen] = useState(false);

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const p = await dbService.getPayments();
    const e = await dbService.getExpenses();
    const l = await dbService.getLoans();
    const m = await dbService.getMembers();
    setPayments(p);
    setExpenses(e);
    setLoans(l);
    setMembers(m);
    setLoading(false);
  }

  const handleDownloadClick = () => {
    setDownloadConfirmOpen(true);
  };

  const downloadReport = async () => {
    setDownloadConfirmOpen(false);
    if (!reportRef.current) return;
    try {
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, pixelRatio: 2 });
      const pdf = new jsPDF('p', 'pt', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => img.onload = resolve);
      
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Annual-Audit-Report-${new Date().getFullYear()}.pdf`);
    } catch (error) {
      console.error("Error generating report:", error);
      alert("রিপোর্ট ডাউনলোড করতে সমস্যা হয়েছে।");
    }
  };

  const totalIncome = payments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const activeLoans = loans.filter(l => l.status === 'active').reduce((acc, curr) => acc + curr.amount, 0);
  const cashInHand = totalIncome - totalExpense - activeLoans;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">বার্ষিক অডিট রিপোর্ট (Audit Report)</h2>
          <p className="text-text-muted">সমিতির ফান্ডের সম্পূর্ণ ব্যালেন্স শিট</p>
        </div>
        <Button variant="outline" onClick={handleDownloadClick}>
          <Download className="mr-2 h-4 w-4" /> রিপোর্ট ডাউনলোড
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-8" ref={reportRef}>
        <div className="text-center mb-10 border-b pb-6">
           <h1 className="text-3xl font-bold text-primary">গরু কল্যাণ সমিতি</h1>
           <p className="text-lg text-text-muted mt-2">বার্ষিক ব্যালেন্স শিট ও অডিট রিপোর্ট</p>
           <p className="text-sm font-semibold mt-1">তারিখ: {format(new Date(), 'dd MMMM, yyyy')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-10">
           <div className="space-y-4">
              <h3 className="font-bold text-lg border-b pb-2 text-text-dark">আয় (Incomes)</h3>
              <div className="flex justify-between text-sm">
                 <span>মোট চাঁদা আদায়</span>
                 <span className="font-semibold text-primary whitespace-nowrap">৳ {totalIncome.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span>অন্যান্য আয়</span>
                 <span className="font-semibold text-primary whitespace-nowrap">৳ 0</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold p-3 rounded-lg text-primary bg-primary-light">
                 <span>সর্বমোট আয় (A)</span>
                 <span className="whitespace-nowrap">৳ {totalIncome.toLocaleString()}</span>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="font-bold text-lg border-b pb-2 text-danger">ব্যয় ও কর্জ (Expenses & Loans)</h3>
              <div className="flex justify-between text-sm">
                 <span>মোট খরচ (প্রজেক্ট/কল্যাণমূলক)</span>
                 <span className="font-semibold text-danger whitespace-nowrap">৳ {totalExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                 <span>বকেয়া লোন/কর্জ</span>
                 <span className="font-semibold text-warning whitespace-nowrap">৳ {activeLoans.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-base font-bold p-3 rounded-lg text-danger bg-danger/10">
                 <span>সর্বমোট ব্যয় ও লোন (B)</span>
                 <span className="whitespace-nowrap">৳ {(totalExpense + activeLoans).toLocaleString()}</span>
              </div>
           </div>
        </div>

        <div className="bg-app-bg p-6 rounded-lg text-center flex flex-col items-center justify-center border border-border">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-text-muted mb-2">বর্তমান স্থিতীয় ব্যালেন্স (Cash at Bank / Hand)</h3>
            <p className="text-4xl font-extrabold text-primary">৳ {cashInHand.toLocaleString()}</p>
            <p className="text-xs text-text-muted mt-2">(সর্বমোট আয় - সর্বমোট ব্যয় ও লোন)</p>
        </div>
        
        <div className="mt-16 pt-8 flex justify-between items-end">
           <div className="text-center">
              <div className="w-32 border-b mb-2" style={{ borderColor: '#a1a1aa' }}></div>
              <p className="text-sm font-medium">ক্যাশিয়ার / হিসাবরক্ষক</p>
           </div>
           <div className="text-center">
              <div className="w-32 border-b mb-2" style={{ borderColor: '#a1a1aa' }}></div>
              <p className="text-sm font-medium">অডিটর / সভাপতি</p>
           </div>
        </div>

      </div>

      <Dialog open={downloadConfirmOpen} onOpenChange={setDownloadConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ডাউনলোড কনফার্মেশন</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>আপনি কি বার্ষিক অডিট রিপোর্টটি পিডিএফ (PDF) হিসেবে ডাউনলোড করতে চান?</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDownloadConfirmOpen(false)}>বাতিল করুন</Button>
            <Button onClick={downloadReport}>হ্যাঁ, ডাউনলোড করুন</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
