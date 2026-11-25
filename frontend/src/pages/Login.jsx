import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, Lock, User, ArrowRight, UserCheck } from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
      addToast(`Logged in successfully as ${username}`, 'success');
      navigate('/');
    } catch (err) {
      if (!err.response) {
        addToast('Cannot connect to backend server at http://127.0.0.1:8000. Please ensure "python manage.py runserver" is running in your terminal!', 'error', 8000);
      } else {
        addToast(err.response?.data?.error || 'Invalid credentials. Please verify your login.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (u) => {
    setUsername(u);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-100 text-slate-800">
      
      {/* Top Govt Bar */}
      <div className="bg-gov-navy text-white px-6 py-3 border-b border-slate-700 shadow flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center p-1">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-gov-gold fill-current">
              <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5zm0 2.2l6 3.75v5.05c0 4.4-3 8.6-6 9.8-3-1.2-6-5.4-6-9.8V7.95l6-3.75z"/>
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-300 font-semibold">Government of India</div>
            <div className="text-sm font-bold text-white">National Land Acquisition & Management System</div>
          </div>
        </div>
        <div className="text-xs text-gov-gold font-mono bg-white/5 px-2.5 py-1 rounded border border-white/10 hidden sm:block">
          RFCTLARR Act 2013 Digital Portal
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 md:grid-cols-12">
          
          {/* Left Hero side */}
          <div className="md:col-span-5 bg-gradient-to-br from-gov-navy to-slate-900 text-white p-8 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs text-teal-300 font-medium mb-6">
                <ShieldCheck className="w-4 h-4 text-gov-teal" />
                <span>Single Sign-On & Role RBAC</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white mb-3 leading-snug">
                Digital Monitoring & Decision Support System
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Comprehensive platform for statutory land acquisition, cadastral GIS mapping, direct compensation awards, and multi-tier government clearances.
              </p>
            </div>

            {/* Demonstration Notice */}
            <div className="mt-8 pt-6 border-t border-white/10 text-xs text-slate-400">
              <div className="font-semibold text-slate-200 mb-1">Academic & Evaluation Demo</div>
              Select any of the 5 preconfigured role accounts below to login instantly.
            </div>
          </div>

          {/* Right Form side */}
          <div className="md:col-span-7 p-8 flex flex-col justify-center">
            
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-900">Officer / Citizen Login</h3>
              <p className="text-xs text-slate-500 mt-1">Enter your registered credentials to access the administrative dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gov-navy focus:border-gov-navy"
                    placeholder="Enter official username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gov-navy focus:border-gov-navy"
                    placeholder="Enter account password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-gov-navy hover:bg-slate-800 text-white font-semibold rounded-lg shadow transition flex items-center justify-center gap-2 text-sm"
              >
                {loading ? 'Authenticating...' : 'Sign In to Portal'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Role Selector Pills */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mb-2.5">
                <UserCheck className="w-4 h-4 text-gov-gold" />
                <span>One-Click Demonstration Roles (Password: password123)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'admin', label: '1. National Admin' },
                  { id: 'state_officer', label: '2. State Officer (MH)' },
                  { id: 'district_officer', label: '3. District Collector (Pune)' },
                  { id: 'dept_officer', label: '4. SLAO Officer (NHAI)' },
                  { id: 'landowner', label: '5. Landowner (Farmer)' },
                ].map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setDemoAccount(role.id)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition font-medium ${
                      username === role.id
                        ? 'bg-gov-navy text-white border-gov-navy shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="py-3 text-center text-xs text-slate-500 border-t border-slate-200 bg-white">
        National Informatics Demonstration Framework • Ministry of Rural Development & Revenue Departments
      </footer>

    </div>
  );
};

export default Login;
