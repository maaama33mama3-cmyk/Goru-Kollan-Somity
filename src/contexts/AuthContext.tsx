import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, isFirebaseConfigured } from '../firebase';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { dbService, Member } from '../services/dbService';

interface AuthContextType {
  currentUser: User | null;
  currentMember: Member | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsMember: (memberId: string, pin: string) => Promise<boolean | string>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  currentMember: null,
  isAdmin: false,
  loading: true,
  signInWithGoogle: async () => {},
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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch settings to check admin emails
        const settings = await dbService.getSettings();
        const admins = settings.adminEmails || [];
        const masterEmail = 'maaama33mama3@gmail.com';
        
        if (user.email === masterEmail || (user.email && admins.includes(user.email))) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false); // They logged in with Google but aren't in the admin list
        }
      } else {
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
    await signInWithPopup(auth, provider);
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
    <AuthContext.Provider value={{ currentUser, currentMember, isAdmin, loading, signInWithGoogle, signInAsMember, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
