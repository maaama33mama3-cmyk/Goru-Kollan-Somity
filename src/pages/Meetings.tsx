import React, { useEffect, useState } from 'react';
import { dbService, Meeting } from '../services/dbService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

export default function Meetings() {
  const { isAdmin } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Add flow
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [minutes, setMinutes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const m = await dbService.getMeetings();
    setMeetings(m);
    setLoading(false);
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !minutes) return;
    await dbService.addMeeting({
      title,
      date,
      minutes
    });
    setAddOpen(false);
    setTitle('');
    setMinutes('');
    loadData();
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await dbService.deleteDocument('meetings', deleteId);
      setDeleteId(null);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">সভার সিদ্ধান্ত (Meeting Minutes)</h2>
          <p className="text-text-muted">সমিতির মাসিক বা বার্ষিক সভার বিস্তারিত এবং রেজুলেশন</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>+ নতুন মিটিং যুক্ত করুন</Button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
             <div className="text-center py-8">লোড হচ্ছে...</div>
          ) : meetings.length === 0 ? (
            <div className="text-center py-8 text-text-muted">এখনো কোনো মিটিং যোগ করা হয়নি</div>
          ) : meetings.map(m => (
            <Card key={m.id} className="theme-card">
              <CardHeader className="bg-app-bg border-b border-border py-4">
                 <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-primary">{m.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold bg-white border border-border px-3 py-1 rounded-full">
                         {format(new Date(m.date), 'dd MMM yyyy')}
                      </span>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)} className="text-danger hover:bg-danger/10 hover:text-danger h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="p-4 pt-6">
                 <p className="whitespace-pre-wrap text-sm text-text-dark leading-relaxed">
                   {m.minutes}
                 </p>
              </CardContent>
            </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl">নতুন সভার বিস্তারিত</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>মিটিং এর নাম / বিষয়</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="যেমন: বাৎসরিক বাজেট মিটিং" />
            </div>
            
            <div className="space-y-2">
              <Label>তারিখ</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>সিদ্ধান্ত ও আলোচনা (Minutes)</Label>
              <textarea 
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[150px]"
                value={minutes} 
                onChange={e => setMinutes(e.target.value)} 
                placeholder="সভায় কী কী আলোচনা হলো তা বিস্তারিত লিখুন..." 
              />
            </div>
            
            <Button type="submit" className="w-full mt-4">সংরক্ষণ করুন</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>মিটিং বাতিল</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-text-muted">আপনি কি নিশ্চিত যে এই মিটিং রেজুলেশনটি মুছে ফেলতে চান? এটি আর ফেরত আনা যাবে না।</p>
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
