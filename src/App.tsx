/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Loans from './pages/Loans';
import Meetings from './pages/Meetings';
import Reports from './pages/Reports';
import Layout from './components/Layout';
import Login from './pages/Login';
import { Button } from '@/components/ui/button';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, currentMember, loading, isAdmin, logout } = useAuth();
  
  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;
  
  if (!currentUser && !currentMember) {
    return <Navigate to="/login" />;
  }
  
  // If logged in via Google but not an admin AND not a standard member, they should not see anything!
  if (currentUser && !isAdmin && !currentMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">অনুমতি নেই</h2>
          <p className="text-gray-600 mb-6 text-sm">
            আপনি যে জিমেইল ({currentUser?.email}) দিয়ে লগইন করেছেন, সেটি অ্যাডমিন হিসেবে অনুমোদিত নয়। দয়া করে অ্যাডমিনের সাথে যোগাযোগ করুন।
          </p>
          <Button onClick={logout} className="w-full">লগআউট করুন</Button>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="members" element={<Members />} />
            <Route path="payments" element={<Payments />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="loans" element={<Loans />} />
            <Route path="meetings" element={<Meetings />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
