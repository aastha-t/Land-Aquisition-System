import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import LandRecords from './pages/LandRecords';
import AcquisitionProjects from './pages/AcquisitionProjects';
import GisMap from './pages/GisMap';
import DocumentVerification from './pages/DocumentVerification';
import CompensationManagement from './pages/CompensationManagement';
import ApprovalsWorkflow from './pages/ApprovalsWorkflow';
import Grievances from './pages/Grievances';
import AnalyticsDecisionSupport from './pages/AnalyticsDecisionSupport';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner label="Authenticating official session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/land-records" element={<LandRecords />} />
              <Route path="/projects" element={<AcquisitionProjects />} />
              <Route path="/gis-map" element={<GisMap />} />
              <Route path="/document-verification" element={<DocumentVerification />} />
              <Route path="/compensation" element={<CompensationManagement />} />
              <Route path="/approvals" element={<ApprovalsWorkflow />} />
              <Route path="/grievances" element={<Grievances />} />
              <Route path="/analytics" element={<AnalyticsDecisionSupport />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<ProtectedLayout />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
