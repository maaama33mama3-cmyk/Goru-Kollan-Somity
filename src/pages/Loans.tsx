import React, { useEffect, useState } from 'react';
import { dbService, Loan, Member } from '../services/dbService';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function Loans() {
  const { isAdmin } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  // Add flow
  const [addOpen, setAddOpen] = useState(false);
  const [memId, setMemId] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const l = await dbService.getLoans();
    const m = await dbService.getMembers();
    setLoans(l);
    setMembers(m);
    setLoading(false);
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memId || !amount) return;
    await dbService.addLoan({
      memberId: memId,
      amount: Number(amount),
      issueDate: new Date().toISOString(),
      status: 'active'
    });
    setAddOpen(false);
    setAmount('');
    loadData();
  };

  const markPaid = async (loanId: string) => {
    if(!confirm("সত্যিই কি কর্জ পরিশোধ হয়েছে?")) return;
    await dbService.markLoanPaid(loanId);
    loadData();
  };

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown';

  const totalGiven = loans.filter(l => l.status === 'active').reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">লোন বা কর্জ (Advance)</h2>
          <p className="text-text-muted">সদস্যদের বিপদের সময় দেওয়া কর্জের বিস্তারিত</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>+ নতুন কর্জ প্রদান</Button>
        )}
      </div>

      <div className="theme-card p-6 border-l-4 border-l-warning">
         <h3 className="text-sm font-semibold opacity-90 text-text-muted">বর্তমানে বকেয়া কর্জ</h3>
         <p className="text-3xl font-bold mt-1 text-warning">৳ {totalGiven.toLocaleString()}</p>
      </div>

      <Card className="theme-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>নাম</TableHead>
              <TableHead>প্রদানের তারিখ</TableHead>
              <TableHead>পরিমান</TableHead>
              <TableHead>স্ট্যাটাস</TableHead>
              <TableHead className="text-right">ক্যাকশন</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : loans.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-muted">এখনো কোনো কর্জ দেওয়া হয়নি</TableCell></TableRow>
            ) : loans.map(l => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{getMemberName(l.memberId)}</TableCell>
                <TableCell>{format(new Date(l.issueDate), 'dd MMM yyyy')}</TableCell>
                <TableCell className="font-bold text-text-dark">৳ {l.amount}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${l.status === 'active' ? 'bg-[#fffbeb] text-[#92400e]' : 'bg-primary-light text-primary'}`}>
                    {l.status === 'active' ? 'বকেয়া' : `পরিশোধিত (${format(new Date(l.returnDate!), 'dd/MM/yy')})`}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {l.status === 'active' && isAdmin && (
                     <Button size="sm" variant="outline" onClick={() => markPaid(l.id)}>পরিশোধ করুন</Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">নতুন কর্জ প্রদান</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>কাকে দেওয়া হচ্ছে?</Label>
              <Select value={memId} onValueChange={setMemId}>
                <SelectTrigger><SelectValue placeholder="সদস্য নির্বাচন করুন" /></SelectTrigger>
                <SelectContent>
                  {members.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>পরিমান (৳)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            
            <Button type="submit" className="w-full mt-4">নিশ্চিত করুন</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
