import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, signInWithAdminEmail, signInAsMember, currentUser, currentMember } = useAuth();
  const [loginType, setLoginType] = useState<'member' | 'admin'>('member');
  const [memberId, setMemberId] = useState('');
  const [pin, setPin] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser || currentMember) {
    return <Navigate to="/" />;
  }

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const success = await signInAsMember(memberId, pin);
    if (typeof success === "string") {
      if (success.toLowerCase().includes("permission") || success.toLowerCase().includes("missing")) {
         setError(`ফায়ারবেস পারমিশন এরর! দয়া করে আপনার Firestore Rules আপডেট করুন যাতে আন-অথেন্টিকেটেড ইউজাররাও members কালেকশন পড়তে পারে। (Error: ${success})`);
      } else {
         setError(`ডাটাবেস এরর: ${success}`);
      }
    } else if (!success) {
      setError(`ইউজারনেম, ফোন অথবা PIN ভুল হয়েছে! (ID: "${memberId}", Pin: "${pin}")`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg p-6">
      <div className="max-w-sm w-full theme-card p-8 space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">গরু কল্যাণ সমিতি</h1>
          <p className="text-text-muted mt-2 text-sm">হিসাব-নিকাশ এবং ফান্ড ম্যানেজমেন্ট</p>
        </div>

        <div className="flex gap-2 p-1 bg-app-bg rounded-lg border">
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === 'member' ? 'bg-primary text-primary-foreground shadow' : 'text-text-muted hover:bg-slate-200'}`}
            onClick={() => setLoginType('member')}
          >
            সদস্য লগইন
          </button>
          <button 
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${loginType === 'admin' ? 'bg-primary text-primary-foreground shadow' : 'text-text-muted hover:bg-slate-200'}`}
            onClick={() => setLoginType('admin')}
          >
            অ্যাডমিন
          </button>
        </div>
        
        {loginType === 'member' ? (
          <form className="space-y-4 text-left" onSubmit={handleMemberLogin}>
            <div>
               <Label>সদস্যের নাম, আইডি (ID) অথবা মোবাইল নম্বর</Label>
               <Input 
                 placeholder="e.g. Khairul, M-101 or 017..." 
                 className="mt-1" 
                 value={memberId} 
                 onChange={e => setMemberId(e.target.value)} 
                 required
               />
            </div>
            <div>
               <Label>পিন নাম্বার (PIN)</Label>
               <div className="relative mt-1">
                 <Input 
                   type={showPin ? "text" : "password"} 
                   placeholder="পিন দিন" 
                   value={pin} 
                   onChange={e => setPin(e.target.value)} 
                   required
                 />
                 <button
                   type="button"
                   onClick={() => setShowPin(!showPin)}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                 >
                   {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                 </button>
               </div>
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </Button>
          </form>
        ) : (
          <div className="pt-4 space-y-6">
             <div className="space-y-4">
                 <p className="text-sm font-medium text-text-dark mb-4 text-left">গুগল দিয়ে সরাসরি লগইন (ব্রাউজারের জন্য):</p>
                 <Button onClick={async () => {
                     try {
                         setError('');
                         await signInWithGoogle();
                     } catch(e: any) {
                         setError(`লগইন ব্যর্থ হয়েছে: ${e.message}`);
                     }
                 }} className="w-full text-base py-6 border bg-white text-gray-700 hover:bg-gray-50" variant="outline" size="lg">
                   <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                     <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                     <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                     <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                     <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                   </svg>
                   Google দিয়ে লগইন
                 </Button>
             </div>
             
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">অথবা (ইন্সটলড অ্যাপের জন্য)</span>
                </div>
             </div>
             
             <form className="space-y-4 text-left" onSubmit={async (e) => {
                 e.preventDefault();
                 setLoading(true);
                 try {
                     setError('');
                     await signInWithAdminEmail(adminEmail.trim(), adminPass);
                 } catch(e: any) {
                     console.error("Login Error Details:", e);
                     const errCode = e.code || '';
                     if (errCode === 'auth/invalid-credential' || errCode === 'auth/wrong-password' || errCode === 'auth/user-not-found') {
                         setError('ইমেইল বা পাসওয়ার্ড ভুল হয়েছে!');
                     } else if (errCode === 'auth/invalid-email') {
                         setError('ইমেইলের বানান সঠিক নয়!');
                     } else if (errCode === 'auth/too-many-requests') {
                         setError('অনেকবার ভুল চেষ্টা করেছেন। কিছুক্ষণ পর আবার চেষ্টা করুন।');
                     } else if (e.message.includes('অনুমোদিত নয়')) {
                         setError(e.message);
                     } else {
                         setError(`লগইন ব্যর্থ। (${errCode || e.message})`);
                     }
                 }
                 setLoading(false);
             }}>
                 <div>
                    <Label>অ্যাডমিন ইমেইল</Label>
                    <Input 
                      type="email"
                      placeholder="admin@gks.com" 
                      className="mt-1" 
                      value={adminEmail} 
                      onChange={e => setAdminEmail(e.target.value)} 
                      required
                    />
                 </div>
                 <div>
                    <Label>অ্যাপ পাসওয়ার্ড</Label>
                    <div className="relative mt-1">
                      <Input 
                        type={showAdminPass ? "text" : "password"} 
                        placeholder="পাসওয়ার্ড দিন" 
                        value={adminPass} 
                        onChange={e => setAdminPass(e.target.value)} 
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPass(!showAdminPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showAdminPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                 </div>
                 {error && <p className="text-danger text-sm">{error}</p>}
                 <Button type="submit" className="w-full" disabled={loading}>
                   {loading ? 'লগইন হচ্ছে...' : 'ইমেইল দিয়ে লগইন'}
                 </Button>
             </form>
          </div>
        )}
      </div>
    </div>
  );
}
