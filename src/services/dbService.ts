import { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

export interface Member {
  id: string;
  name: string;
  phone: string;
  joiningDate: string;
  status: 'active' | 'inactive';
  shares?: number;
  memberId?: string; // e.g. "M-101"
  pin?: string; // e.g. "1234"
}

export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  method: 'bKash' | 'Nagad' | 'Bank' | 'Cash';
  month: string;
  date: string;
  addedBy: string;
  fundType?: string; // "মাসিক চাঁদা" | "জরুরি ফান্ড"
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  addedBy: string;
  projectName?: string; // e.g. "কুরবানির গরু", "এতিমখানায় দান"
}

export interface Loan {
  id: string;
  memberId: string;
  amount: number;
  issueDate: string;
  status: 'active' | 'paid';
  returnDate?: string;
}

export interface Meeting {
  id: string;
  date: string;
  title: string;
  minutes: string; // Detail notes
}

export interface Settings {
  yearlyTarget: number;
  shareValue: number;
  adminEmails?: string[];
}

const getLocal = (key: string) => JSON.parse(localStorage.getItem(`gks_${key}`) || '[]');
const setLocal = (key: string, data: any) => localStorage.setItem(`gks_${key}`, JSON.stringify(data));

// In-memory cache for ultra-fast navigation
const CACHE_TTL = 30000; // 30 seconds
const cache = {
  members: { data: null as Member[] | null, time: 0 },
  payments: { data: null as Payment[] | null, time: 0 },
  expenses: { data: null as Expense[] | null, time: 0 },
  loans: { data: null as Loan[] | null, time: 0 },
  meetings: { data: null as Meeting[] | null, time: 0 },
  settings: { data: null as Settings | null, time: 0 },
};

export const dbService = {
  async getMembers(forceFresh?: boolean): Promise<Member[]> {
    if (!forceFresh && cache.members.data && Date.now() - cache.members.time < CACHE_TTL) return cache.members.data;

    let result: Member[] = [];
    if (!isFirebaseConfigured) {
      result = getLocal('members').sort((a: Member, b: Member) => a.name.localeCompare(b.name));
    } else if (db) {
      const q = query(collection(db, 'members'), orderBy('name'));
      const snapshot = await getDocs(q);
      result = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Member));
    }
    
    cache.members = { data: result, time: Date.now() };
    return result;
  },

  async addMember(memberData: Omit<Member, 'id'>) {
    let id = '';
    if (!isFirebaseConfigured) {
      const members = getLocal('members');
      const newMember = { ...memberData, id: Math.random().toString(36).substring(2, 9) };
      members.push(newMember);
      setLocal('members', members);
      id = newMember.id;
    } else {
      if (!db) throw new Error("DB not initialized");
      const docRef = await addDoc(collection(db, 'members'), memberData);
      id = docRef.id;
    }
    cache.members.data = null; // invalidate cache
    return id;
  },

  async updateMember(id: string, data: Partial<Member>) {
    if (!isFirebaseConfigured) {
      let members = getLocal('members');
      members = members.map((m: Member) => m.id === id ? { ...m, ...data } : m);
      setLocal('members', members);
    } else {
      if (!db) throw new Error("DB not initialized");
      await updateDoc(doc(db, 'members', id), data as any);
    }
    cache.members.data = null; // invalidate
  },

  async deleteMember(id: string) {
    if (!isFirebaseConfigured) {
      let members = getLocal('members');
      members = members.filter((m: Member) => m.id !== id);
      setLocal('members', members);
    } else {
      if (!db) throw new Error("DB not initialized");
      await deleteDoc(doc(db, 'members', id));
    }
    cache.members.data = null; // invalidate
  },

  async getPayments(forceFresh?: boolean, month?: string): Promise<Payment[]> {
    let allPayments: Payment[] = [];
    if (!forceFresh && cache.payments.data && Date.now() - cache.payments.time < CACHE_TTL) {
      allPayments = cache.payments.data;
    } else {
      if (!isFirebaseConfigured) {
        allPayments = getLocal('payments') as Payment[];
      } else if (db) {
        const q = collection(db, 'payments') as any;
        const snapshot = await getDocs(q);
        allPayments = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Payment));
      }
      cache.payments = { data: allPayments, time: Date.now() };
    }
    
    if (month) return allPayments.filter(p => p.month === month);
    return allPayments;
  },

  async addPayment(paymentData: Omit<Payment, 'id'>) {
    let id = '';
    if (!isFirebaseConfigured) {
      const payments = getLocal('payments');
      const newPayment = { ...paymentData, id: Math.random().toString(36).substring(2, 9) };
      payments.push(newPayment);
      setLocal('payments', payments);
      id = newPayment.id;
    } else {
      if (!db) throw new Error("DB not initialized");
      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      id = docRef.id;
    }
    cache.payments.data = null; // invalidate
    return id;
  },

  async getExpenses(): Promise<Expense[]> {
    if (cache.expenses.data && Date.now() - cache.expenses.time < CACHE_TTL) return cache.expenses.data;
    
    let result: Expense[] = [];
    if (!isFirebaseConfigured) {
      result = getLocal('expenses').sort((a: Expense, b: Expense) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (db) {
      const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      result = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Expense));
    }
    
    cache.expenses = { data: result, time: Date.now() };
    return result;
  },

  async addExpense(expenseData: Omit<Expense, 'id'>) {
    let id = '';
    if (!isFirebaseConfigured) {
      const expenses = getLocal('expenses');
      const newExpense = { ...expenseData, id: Math.random().toString(36).substring(2, 9) };
      expenses.push(newExpense);
      setLocal('expenses', expenses);
      id = newExpense.id;
    } else {
      if (!db) throw new Error("DB not initialized");
      const docRef = await addDoc(collection(db, 'expenses'), expenseData);
      id = docRef.id;
    }
    cache.expenses.data = null; // invalidate
    return id;
  },

  async getLoans(): Promise<Loan[]> {
    if (cache.loans.data && Date.now() - cache.loans.time < CACHE_TTL) return cache.loans.data;

    let result: Loan[] = [];
    if (!isFirebaseConfigured) {
      result = getLocal('loans').sort((a: Loan, b: Loan) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
    } else if (db) {
      const q = query(collection(db, 'loans'), orderBy('issueDate', 'desc'));
      const snapshot = await getDocs(q);
      result = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Loan));
    }
    
    cache.loans = { data: result, time: Date.now() };
    return result;
  },

  async addLoan(loanData: Omit<Loan, 'id'>) {
    let id = '';
    if (!isFirebaseConfigured) {
      const loans = getLocal('loans');
      const newLoan = { ...loanData, id: Math.random().toString(36).substring(2, 9) };
      loans.push(newLoan);
      setLocal('loans', loans);
      id = newLoan.id;
    } else {
      if (!db) throw new Error("DB not initialized");
      const docRef = await addDoc(collection(db, 'loans'), loanData);
      id = docRef.id;
    }
    cache.loans.data = null;
    return id;
  },
  
  async markLoanPaid(loanId: string) {
    if (!isFirebaseConfigured) {
      let loans = getLocal('loans') as Loan[];
      loans = loans.map(l => l.id === loanId ? { ...l, status: 'paid', returnDate: new Date().toISOString() } : l);
      setLocal('loans', loans);
    } else {
      if (!db) throw new Error("DB not initialized");
      await updateDoc(doc(db, 'loans', loanId), { status: 'paid', returnDate: new Date().toISOString() });
    }
    cache.loans.data = null;
  },

  async getMeetings(): Promise<Meeting[]> {
    if (cache.meetings.data && Date.now() - cache.meetings.time < CACHE_TTL) return cache.meetings.data;

    let result: Meeting[] = [];
    if (!isFirebaseConfigured) {
        result = getLocal('meetings').sort((a: Meeting, b: Meeting) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (db) {
      const q = query(collection(db, 'meetings'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      result = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Meeting));
    }
    cache.meetings = { data: result, time: Date.now() };
    return result;
  },

  async addMeeting(meetingData: Omit<Meeting, 'id'>) {
    let id = '';
    if (!isFirebaseConfigured) {
        const meetings = getLocal('meetings');
        const newMeeting = { ...meetingData, id: Math.random().toString(36).substring(2, 9) };
        meetings.push(newMeeting);
        setLocal('meetings', meetings);
        id = newMeeting.id;
    } else {
      if (!db) throw new Error("DB not initialized");
      const docRef = await addDoc(collection(db, 'meetings'), meetingData);
      id = docRef.id;
    }
    cache.meetings.data = null;
    return id;
  },

  async getSettings(): Promise<Settings> {
    if (cache.settings.data && Date.now() - cache.settings.time < CACHE_TTL) return cache.settings.data;

    let result: Settings = { yearlyTarget: 100000, shareValue: 250 };
    if (!isFirebaseConfigured) {
      const s = localStorage.getItem('gks_settings');
      if (s) result = JSON.parse(s);
    } else if (db) {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) result = docSnap.data() as Settings;
    }
    cache.settings = { data: result, time: Date.now() };
    return result;
  },
  
  async saveSettings(settingsData: Settings) {
     if (!isFirebaseConfigured) {
       localStorage.setItem('gks_settings', JSON.stringify(settingsData));
     } else {
       if (!db) throw new Error("DB not initialized");
       await setDoc(doc(db, 'settings', 'general'), { ...settingsData, id: 'general' }, { merge: true });
     }
     cache.settings.data = null;
  }
};
