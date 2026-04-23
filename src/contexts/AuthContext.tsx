import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, isFirebaseConfigured } from '../firebase';
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { dbService, Member } from '../services/dbService';

interface AuthContextType {
  currentUser: User | null;
  currentMember: Member | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithAdminEmail: (email: string, pass: string) => Promise<void>;
  signInAsMember: (memberId: string, pin: string) => Promise<boolean | string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  currentMember: null,
  isAdmin: false,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithAdminEmail: async () => {},
  signInAsMember: async () => false,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check persisted member login
  useEffect(() => {
    const savedMember = localStorage.getItem('gks_member_auth');
    if (savedMember) {
      setCurrentMember(JSON.parse(savedMember));
    }
  }, []);

  const checkIfAdmin = async (email: string | null) => {
    if (!email) return false;
    const normalizedEmail = email.trim().toLowerCase();
    
    let admins: string[] = [];
    try {
      const settings = await dbService.getSettings();
      admins = settings.adminEmails || [];
    } catch(e) {
      console.warn("Could not fetch admin settings from DB (likely rules), falling back to master emails", e);
    }
    const masterEmails = ['maaama33mama3@gmail.com', 'admin@gks.com']; // Only allowing exact matches
    
    const allAdmins = [...masterEmails, ...admins].map(a => a.trim().toLowerCase());
    return allAdmins.includes(normalizedEmail);
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // Local offline mode
      const isFakeLogged = localStorage.getItem('gks_fake_logged_in');
      if (isFakeLogged === 'true') {
        setCurrentUser({ uid: 'local', email: 'admin@local.com', displayName: 'লোকাল এডমিন', photoURL: '' } as User);
        setIsAdmin(true);
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    // Process potential redirect result first for PWA/Mobile
    getRedirectResult(auth).then(async (result) => {
      if (result?.user) {
         const isValidAuth = await checkIfAdmin(result.user.email);
         if (!isValidAuth) {
            await signOut(auth);
            alert('আপনার ইমেইলটি অ্যাডমিন হিসেবে অনুমোদিত নয়!'); 
         }
      }
    }).catch((error) => {
      console.error("Google Auth Redirect Error:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isValid = await checkIfAdmin(user.email);
        
        if (isValid) {
          setCurrentUser(user);
          setIsAdmin(true);
        } else {
          // They logged in but aren't in the admin list
          await signOut(auth); // Kick them immediately
          setCurrentUser(null);
          setIsAdmin(false); 
        }
      } else {
        setCurrentUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      localStorage.setItem('gks_fake_logged_in', 'true');
      setCurrentUser({ uid: 'local', email: 'admin@local.com', displayName: 'লোকাল এডমিন', photoURL: '' } as User);
      setIsAdmin(true);
      return;
    }
    if (!auth) throw new Error("Firebase auth not initialized");
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    // In Standalone mode (PWA/Home Screen), popups often get blocked or crash the webview
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in window.navigator && (window.navigator as any).standalone);
    
    if (isStandalone || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      await signInWithRedirect(auth, provider);
    } else {
      const result = await signInWithPopup(auth, provider);
      const isValid = await checkIfAdmin(result.user.email);
      if (!isValid) {
         await signOut(auth);
         throw new Error("এই জিমেইলটি অ্যাডমিন প্যানেলের জন্য অনুমোদিত নয়!");
      }
    }
  };

  const signInWithAdminEmail = async (email: string, pass: string) => {
    if (!auth) throw new Error("Firebase auth not initialized");
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    const isValid = await checkIfAdmin(credential.user.email);
    if (!isValid) {
       await signOut(auth);
       throw new Error("এই ইমেইলটি অ্যাডমিন প্যানেলের জন্য অনুমোদিত নয়!");
    }
  };

  const signInAsMember = async (memberId: string, pin: string) => {
    try {
      const members = await dbService.getMembers(true);
      // Allow login with either memberId, Phone, or Name (case-insensitive and trimmed)
      const sanitizedInput = memberId.trim().toLowerCase();
      const rawPin = pin.trim();
      const sanitizedPin = pin.trim().toLowerCase();
      
      const member = members.find(m => {
        const mId = (m.memberId || '').trim().toLowerCase();
        const mPhone = (m.phone || '').trim().toLowerCase();
        const mName = (m.name || '').trim().toLowerCase();
        
        const mPinRaw = (m.pin || '').trim();
        const mPinLower = mPinRaw.toLowerCase();
        
        const isMatchUser = (mId === sanitizedInput || mPhone === sanitizedInput || mName === sanitizedInput);
        const isMatchPin = (mPinRaw === rawPin || mPinLower === sanitizedPin);
        
        return isMatchUser && isMatchPin;
      });
      
      if (member) {
        console.log("Found member", member);
        setCurrentMember(member);
        localStorage.setItem('gks_member_auth', JSON.stringify(member));
        return true;
      }
      return false;
    } catch (e: any) {
      console.error("Login Query Error: ", e);
      return e.message || "Unknown db error";
    }
  }

  const logout = async () => {
    setCurrentMember(null);
    localStorage.removeItem('gks_member_auth');
    if (!isFirebaseConfigured) {
      localStorage.removeItem('gks_fake_logged_in');
      setCurrentUser(null);
      setIsAdmin(false);
      return;
    }
    if (auth) {
      await signOut(auth);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, currentMember, isAdmin, loading, signInWithGoogle, signInWithAdminEmail, signInAsMember, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
