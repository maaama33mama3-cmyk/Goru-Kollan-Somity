import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, CreditCard, Receipt, LogOut, HandCoins, FileText, PieChart, Menu, X, Palette, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const THEMES = [
  { name: 'Emerald (Default)', color: '#10b981', light: '#ecfdf5', dark: '#064e3b', hsl: '160 84% 39%' },
  { name: 'Blue', color: '#3b82f6', light: '#eff6ff', dark: '#1e3a8a', hsl: '217 91% 60%' },
  { name: 'Violet', color: '#8b5cf6', light: '#f5f3ff', dark: '#4c1d95', hsl: '262 83% 66%' },
  { name: 'Rose', color: '#f43f5e', light: '#fff1f2', dark: '#881337', hsl: '350 89% 60%' },
  { name: 'Orange', color: '#f97316', light: '#fff7ed', dark: '#7c2d12', hsl: '25 95% 53%' },
];

export default function Layout() {
  const { logout, currentUser, currentMember, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Apply theme on load
  useEffect(() => {
    const savedTheme = localStorage.getItem('gks_theme');
    if (savedTheme) {
      applyTheme(JSON.parse(savedTheme));
    }
    const savedMode = localStorage.getItem('gks_dark_mode');
    if (savedMode === 'true' || (!savedMode && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('gks_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('gks_dark_mode', 'false');
    }
  };

  const applyTheme = (theme: typeof THEMES[0]) => {
    const root = document.documentElement;
    root.style.setProperty('--app-primary', theme.color);
    root.style.setProperty('--app-primary-light', theme.light);
    root.style.setProperty('--app-accent', theme.dark);
    root.style.setProperty('--primary', theme.hsl);
    root.style.setProperty('--ring', theme.hsl);
    localStorage.setItem('gks_theme', JSON.stringify(theme));
  };

  const handleLogoutClick = () => {
    setLogoutConfirmOpen(true);
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    logout();
  };

  const adminNavs = [
    { to: "/", icon: LayoutDashboard, label: "ড্যাশবোর্ড" },
    { to: "/members", icon: Users, label: "সদস্য তালিকা" },
    { to: "/payments", icon: CreditCard, label: "চাঁদা আদায় (Funds)" },
    { to: "/loans", icon: HandCoins, label: "লোন বা কর্জ" },
    { to: "/expenses", icon: Receipt, label: "খরচ ও প্রজেক্ট" },
    { to: "/meetings", icon: FileText, label: "মিটিং রেজুলেশন" },
    { to: "/reports", icon: PieChart, label: "অডিট রিপোর্ট" },
  ];

  const memberNavs = [
    { to: "/", icon: FileText, label: "আমার খতিয়ান (Ledger)" },
  ];

  const navs = currentMember ? memberNavs : adminNavs;

  const userName = currentUser?.displayName || currentMember?.name || "অজানা ব্যবহারকারী";
  const userDetail = currentUser?.email || currentMember?.phone || (currentMember?.memberId ? `ID: ${currentMember.memberId}` : "");

  return (
    <div className="flex min-h-screen bg-app-bg text-text-dark">
      <aside className="w-64 bg-card border-border border-r flex flex-col hidden md:flex">
        <div className="p-6 border-b border-border">
          <h1 className="font-bold text-xl tracking-tight text-primary">গরু কল্যাণ সমিতি</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navs.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                  isActive ? "bg-primary-light text-primary" : "text-text-muted hover:bg-app-bg hover:text-text-dark"
                }`
              }
            >
              <n.icon className="mr-3 h-5 w-5" />
              {n.label}
            </NavLink>
          ))}
        </nav>
        
        <div className="px-4 pb-4 space-y-1">
          <Button variant="ghost" className="w-full justify-start text-text-muted hover:bg-app-bg hover:text-text-dark" onClick={() => setThemeOpen(true)}>
            <Palette className="mr-3 h-5 w-5" />
            থিম পরিবর্তন
          </Button>
          <Button variant="ghost" className="w-full justify-start text-text-muted hover:bg-app-bg hover:text-text-dark" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
            {isDarkMode ? 'লাইট মোড' : 'নাইট মোড'}
          </Button>
        </div>

        <div className="p-4 border-t border-border">
          <div className="flex items-center mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-primary-light text-primary flex items-center justify-center overflow-hidden">
              {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="avatar" /> : <Users className="h-4 w-4" />}
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-text-dark truncate">{userName}</p>
              <p className="text-xs text-text-muted truncate">{userDetail}</p>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start text-text-muted border-border" onClick={handleLogoutClick}>
            <LogOut className="mr-2 h-4 w-4" />
            লগআউট
          </Button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-primary/20 bg-primary text-primary-foreground shadow-md">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20 hover:text-white" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-bold text-lg text-primary-foreground">গরু কল্যাণ সমিতি</h1>
          </div>
          <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20 hover:text-white" onClick={handleLogoutClick}><LogOut className="h-5 w-5"/></Button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative flex flex-col w-64 max-w-xs bg-card border-r border-border h-full shadow-2xl animate-in slide-in-from-left duration-200">
               <div className="p-4 border-b border-primary/20 bg-primary flex justify-between items-center shadow-sm">
                 <h1 className="font-bold text-lg text-primary-foreground">সমিতি মেনু</h1>
                 <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/20 hover:text-white" onClick={() => setMobileMenuOpen(false)}>
                   <X className="h-5 w-5" />
                 </Button>
               </div>
               <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                 {navs.map((n) => (
                   <NavLink
                     key={n.to}
                     to={n.to}
                     onClick={() => setMobileMenuOpen(false)}
                     className={({ isActive }) =>
                       `flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-colors ${
                         isActive ? "bg-primary-light text-primary" : "text-text-muted hover:bg-app-bg hover:text-text-dark"
                       }`
                     }
                   >
                     <n.icon className="mr-3 h-5 w-5" />
                     {n.label}
                   </NavLink>
                 ))}
               </nav>

               <div className="p-4 border-t border-border">
                 <div className="space-y-1 mb-4">
                   <Button 
                     variant="ghost" 
                     className="w-full justify-start text-text-muted hover:bg-app-bg hover:text-text-dark" 
                     onClick={() => {
                       setMobileMenuOpen(false);
                       setThemeOpen(true);
                     }}
                   >
                     <Palette className="mr-3 h-5 w-5" />
                     থিম পরিবর্তন
                   </Button>
                   <Button 
                     variant="ghost" 
                     className="w-full justify-start text-text-muted hover:bg-app-bg hover:text-text-dark" 
                     onClick={() => {
                       toggleDarkMode();
                     }}
                   >
                     {isDarkMode ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
                     {isDarkMode ? 'লাইট মোড' : 'নাইট মোড'}
                   </Button>
                 </div>

                 <div className="flex items-center mb-4 px-2">
                   <div className="h-8 w-8 rounded-full bg-primary-light text-primary flex items-center justify-center overflow-hidden">
                     {currentUser?.photoURL ? <img src={currentUser.photoURL} alt="avatar" /> : <Users className="h-4 w-4" />}
                   </div>
                   <div className="ml-3 overflow-hidden">
                     <p className="text-sm font-medium text-text-dark truncate">{userName}</p>
                     <p className="text-xs text-text-muted truncate">{userDetail}</p>
                   </div>
                 </div>
                 
                 <Button variant="outline" className="w-full justify-start text-text-muted border-border" onClick={handleLogoutClick}>
                   <LogOut className="mr-2 h-4 w-4" />
                   লগআউট
                 </Button>
               </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-app-bg text-text-dark relative z-0">
          <div className="max-w-6xl mx-auto pb-20 md:pb-0">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>লগআউট কনফার্মেশন</DialogTitle>
            <DialogDescription>
              আপনি কি নিশ্চিত যে আপনি অ্যাপ্লিকেশন থেকে লগআউট করতে চান?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
              বাতিল
            </Button>
            <Button variant="destructive" onClick={confirmLogout}>
              লগআউট করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Theme Selector Dialog */}
      <Dialog open={themeOpen} onOpenChange={setThemeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>থিম কাস্টমাইজেশন</DialogTitle>
            <DialogDescription>
              আপনার পছন্দের কালার থিম নির্বাচন করুন
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            {THEMES.map((theme) => (
              <button
                key={theme.name}
                onClick={() => applyTheme(theme)}
                className="flex flex-col items-center justify-center p-4 rounded-xl border-2 hover:border-primary transition-all gap-2"
                style={{ borderColor: localStorage.getItem('gks_theme')?.includes(theme.color) ? theme.color : 'transparent', backgroundColor: theme.light }}
              >
                <div className="w-8 h-8 rounded-full" style={{ backgroundColor: theme.color }}></div>
                <span className="text-sm font-medium" style={{ color: theme.dark }}>{theme.name}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setThemeOpen(false)}>বন্ধ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
