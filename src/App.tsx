import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { I18nProvider } from './contexts/I18nContext';
import { ToastProvider } from './contexts/ToastContext';
import { PWAProvider } from './contexts/PWAContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Staff from './pages/Staff';
import Income from './pages/Income';
import Expenses from './pages/Expenses';
import Maintenance from './pages/Maintenance';
import Purchases from './pages/Purchases';
import Reports from './pages/Reports';
import Profit from './pages/Profit';
import Users from './pages/Users';
import Backup from './pages/Backup';
import Settings from './pages/Settings';
import PrintReceipt from './pages/PrintReceipt';
import PrintReport from './pages/PrintReport';

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <PWAProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/print/receipt/:id" element={<ProtectedRoute><PrintReceipt /></ProtectedRoute>} />
              <Route path="/print/report" element={<ProtectedRoute><PrintReport /></ProtectedRoute>} />
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="staff" element={<Staff />} />
                <Route path="income" element={<Income />} />
                <Route path="expenses" element={<Expenses />} />
                <Route path="maintenance" element={<Maintenance />} />
                <Route path="purchases" element={<Purchases />} />
                <Route path="reports" element={<Reports />} />
                <Route path="profit" element={<Profit />} />
                <Route path="users" element={<Users />} />
                <Route path="backup" element={<Backup />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
        </PWAProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
