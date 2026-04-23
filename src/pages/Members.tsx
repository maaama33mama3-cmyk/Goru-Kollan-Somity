import React, { useEffect, useState } from 'react';
import { dbService, Member, Payment } from '../services/dbService';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export default function Members() {
  const { isAdmin } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [settings, setSettings] = useState({ yearlyTarget: 100000, shareValue: 250 });
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [passbookOpen, setPassbookOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Add Member State
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newShares, setNewShares] = useState('1');
  const [newMemberId, setNewMemberId] = useState('');
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const m = await dbService.getMembers(true).catch(e => { console.error(e); return []; });
      const p = await dbService.getPayments(true).catch(e => { console.error(e); return []; });
      const s = await dbService.getSettings().catch(e => { console.error(e); return { yearlyTarget: 100000, shareValue: 250 }; });
      setMembers(m);
      setPayments(p);
      setSettings(s as any);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  const handleDeleteMember = async () => {
    if (!selectedMember) return;
    await dbService.deleteMember(selectedMember.id);
    setDeleteConfirmOpen(false);
    setPassbookOpen(false);
    loadData();
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    await dbService.addMember({
      name: newName,
      phone: newPhone,
      joiningDate: new Date().toISOString(),
      status: 'active',
      shares: Number(newShares),
      memberId: newMemberId,
      pin: newPin
    });
    setNewName('');
    setNewPhone('');
    setNewShares('1');
    setNewMemberId('');
    setNewPin('');
    setAddOpen(false);
    loadData();
  };

  const openPassbook = (m: Member) => {
    setSelectedMember(m);
    setPassbookOpen(true);
  };

  const getMemberPayments = (mId: string) => {
    return payments.filter(p => p.memberId === mId).sort((a,b) => b.month.localeCompare(a.month));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-2xl font-bold tracking-tight">সদস্য তালিকা</h2>
          <p className="text-text-muted text-sm sm:text-base">সমিতির সকল সদস্য ও তাদের ব্যক্তিগত প্রোফাইল (পাসবই)</p>
        </div>
        {isAdmin && (
          <Button className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>+ নতুন সদস্য</Button>
        )}
      </div>

      <Card className="theme-card relative">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">নাম</TableHead>
                <TableHead className="whitespace-nowrap">ফোন নম্বর</TableHead>
                <TableHead className="text-center whitespace-nowrap">শেয়ার</TableHead>
                <TableHead className="text-right whitespace-nowrap">মোট জমা</TableHead>
                <TableHead className="text-center whitespace-nowrap">স্ট্যাটাস</TableHead>
                <TableHead className="text-right whitespace-nowrap">বিস্তারিত</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map(m => {
                const totalDeposit = getMemberPayments(m.id).reduce((sum, p) => sum + p.amount, 0);
                return (
                  <TableRow key={m.id} className="cursor-pointer hover:bg-app-bg" onClick={() => openPassbook(m)}>
                    <TableCell className="font-medium whitespace-nowrap">{m.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.phone}</TableCell>
                    <TableCell className="text-center font-bold text-text-dark whitespace-nowrap">{m.shares || 1} টি</TableCell>
                    <TableCell className="text-right font-bold text-primary whitespace-nowrap">৳ {totalDeposit.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs whitespace-nowrap font-semibold ${m.status === 'active' ? 'bg-primary-light text-primary' : 'bg-red-100 text-red-800'}`}>
                        {m.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="default" size="sm" className="whitespace-nowrap rounded-full px-4 h-8 text-xs bg-primary hover:bg-primary/90 text-white shadow-sm">
                        পাসবই দেখুন <span className="ml-1 hidden sm:inline">→</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>নতুন সদস্য যোগ করুন</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>নাম</Label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="সদস্যের নাম" />
              </div>
              <div className="space-y-2">
                <Label>মোবাইল নম্বর</Label>
                <Input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="017..." />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>লগইন আইডি (অপশনাল)</Label>
                <Input value={newMemberId} onChange={e => setNewMemberId(e.target.value)} placeholder="e.g. M-101" />
              </div>
              <div className="space-y-2">
                <Label>পাসওয়ার্ড / পিন (PIN)</Label>
                <Input value={newPin} onChange={e => setNewPin(e.target.value)} placeholder="e.g. 1234" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>শেয়ার সংখ্যা</Label>
              <Input type="number" min="1" value={newShares} onChange={e => setNewShares(e.target.value)} placeholder="1" />
              <p className="text-xs text-text-muted mt-1">১টি শেয়ার = ৳{settings.shareValue} (মাসিক চাঁদা: ৳{Number(newShares || 1) * settings.shareValue})</p>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">সদস্যরা তাদের 'লগইন আইডি' অথবা 'মোবাইল নম্বর' এবং 'পিন' ব্যবহার করে অ্যাপে ঢুঁকে নিজ নিজ হিসাব দেখতে পারবেন।</p>
            <Button type="submit" className="w-full">যুক্ত করুন</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={passbookOpen} onOpenChange={setPassbookOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ব্যক্তিগত পাসবই</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-6">
              <div className="bg-app-bg p-4 rounded-xl flex items-center justify-between border border-border">
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                  <p className="text-sm text-text-muted">যোগদানের তারিখ: {format(new Date(selectedMember.joiningDate), 'dd MMM, yyyy')}</p>
                  <p className="text-sm text-text-muted mt-1">
                    মোট শেয়ার: <span className="font-semibold text-text-dark">{selectedMember.shares || 1} টি</span> 
                    <span className="hidden sm:inline">&nbsp; | &nbsp;</span>
                    <span className="block sm:inline mt-1 sm:mt-0">মাসিক চাঁদা: <span className="font-semibold text-text-dark">৳ {(selectedMember.shares || 1) * settings.shareValue}</span></span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-sm text-text-muted">মোট প্রদান</p>
                  <p className="text-2xl font-bold text-primary">
                    ৳{getMemberPayments(selectedMember.id).reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="p-3 bg-app-card border border-app-border rounded-lg text-sm shadow-sm flex flex-col justify-center">
                   <p className="text-text-muted text-xs mb-1">লগইন আইডি</p>
                   <p className="font-bold text-primary select-all">{selectedMember.memberId || 'N/A'}</p>
                </div>
                <div className="p-3 bg-app-card border border-app-border rounded-lg text-sm shadow-sm flex flex-col justify-center">
                   <p className="text-text-muted text-xs mb-1">লগইন পাসওয়ার্ড (PIN)</p>
                   <p className="font-bold text-primary select-all">{selectedMember.pin || 'দেওয়া হয়নি'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-3">জমার ইতিহাস</h4>
                {getMemberPayments(selectedMember.id).length > 0 ? (
                  <Table border={1}>
                    <TableHeader>
                      <TableRow>
                        <TableHead>মাস</TableHead>
                        <TableHead>পরিমান</TableHead>
                        <TableHead>মাধ্যম</TableHead>
                        <TableHead>তারিখ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getMemberPayments(selectedMember.id).map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.month}</TableCell>
                          <TableCell>৳ {p.amount}</TableCell>
                          <TableCell>{p.method}</TableCell>
                          <TableCell className="text-sm font-medium" style={{ color: '#71717a' }}>{format(new Date(p.date), 'dd/MM/yyyy')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm font-medium" style={{ color: '#71717a' }}>এখনো কোনো চাঁদা প্রদান করেননি।</p>
                )}
              </div>
              
              <div className="pt-4 border-t border-border flex justify-end">
                <Button variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  সদস্য বাতিল করুন
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-danger flex items-center gap-2">সতর্কতা</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="font-medium text-text-dark">আপনি কি নিশ্চিত যে আপনি {selectedMember?.name}-কে সদস্য তালিকা থেকে বাদ দিতে চান?</p>
            <p className="text-sm text-text-muted mt-2">সদস্য বাতিল করার আগে তার সমস্ত লেনদেনের হিসাব বুঝিয়ে দেওয়া হয়েছে কিনা নিশ্চিত করুন। একবার বাতিল করলে তা আর ফিরে পাওয়া যাবে না।</p>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>বাতিল</Button>
            <Button variant="destructive" onClick={handleDeleteMember}>হ্যাঁ, বাদ দিন</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
