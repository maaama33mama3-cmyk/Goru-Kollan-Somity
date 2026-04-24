import React, { useEffect, useState } from 'react';
import { dbService, Expense } from '../services/dbService';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

export default function Expenses() {
  const { isAdmin, currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Add flow
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('কল্যাণমূলক কাজ');
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const e = await dbService.getExpenses();
    setExpenses(e);
    setLoading(false);
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    await dbService.addExpense({
      description,
      amount: Number(amount),
      category,
      projectName,
      date: new Date().toISOString(),
      addedBy: currentUser?.email || 'unknown'
    });
    setAddOpen(false);
    setDescription('');
    setAmount('');
    setProjectName('');
    loadData();
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await dbService.deleteDocument('expenses', deleteId);
      setDeleteId(null);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">খরচের হিসাব (Expense)</h2>
          <p className="text-text-muted">বছর শেষে কল্যাণমূলক কাজের খরচের বিবরনী</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)} variant="destructive">+ নতুন খরচ এন্ট্রি</Button>
        )}
      </div>

      <Card className="theme-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>তারিখ</TableHead>
              <TableHead>বিবরন</TableHead>
              <TableHead>ক্যাটাগরি/প্রজেক্ট</TableHead>
              <TableHead className="text-right">পরিমান (৳)</TableHead>
              {isAdmin && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8">লোড হচ্ছে...</TableCell></TableRow>
            ) : expenses.length === 0 ? (
              <TableRow><TableCell colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-text-muted">এখনো কোনো খরচ নেই</TableCell></TableRow>
            ) : expenses.map(ex => (
              <TableRow key={ex.id}>
                <TableCell>{format(new Date(ex.date), 'dd MMM yyyy')}</TableCell>
                <TableCell className="font-medium">{ex.description}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    <span className="bg-app-bg border border-border text-text-dark px-2 py-1 rounded text-[10px] font-semibold">
                      {ex.category}
                    </span>
                    {ex.projectName && (
                       <span className="text-xs text-primary font-medium">{ex.projectName}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-bold text-danger">৳ {ex.amount}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(ex.id)} className="text-danger hover:bg-danger/10 hover:text-danger h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-danger text-xl">খরচ এন্ট্রি করুন</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>বিবরণ (কোথায় খরচ হলো?)</Label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="যেমন: এতিমখানায় খাবার বিতরণ" />
            </div>

            <div className="space-y-2">
              <Label>প্রজেক্টের নাম (ঐচ্ছিক)</Label>
              <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="যেমন: কুরবানির গরু ক্রয়" />
            </div>
            
            <div className="space-y-2">
              <Label>পরিমান (৳)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            
            <Button type="submit" variant="destructive" className="w-full mt-4">খরচ যুক্ত করুন</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>খরচ রেকর্ড বাতিল</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-text-muted">আপনি কি নিশ্চিত যে এই খরচের রেকর্ডটি মুছে ফেলতে চান? এই অ্যাকশনটি আর পরিবর্তন করা যাবে না।</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)}>বাতিল</Button>
            <Button variant="destructive" onClick={confirmDelete}>হ্যাঁ, মুছে ফেলুন</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
