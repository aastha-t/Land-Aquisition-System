import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import {
  FolderKanban,
  MapPin,
  Coins,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Link } from 'react-router-dom';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/analytics/dashboard/');
        setStats(res.data);
      } catch (err) {
        console.error('Error fetching dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <LoadingSpinner label="Compiling real-time land acquisition analytics..." />;
  if (!stats) return <div className="p-8 text-center text-rose-600">Failed to load statistics.</div>;

  const PIE_COLORS = ['#0d9488', '#0284c7', '#10b981', '#f43f5e'];

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Real-Time Decision Support Dashboard
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            National land acquisition monitoring, compensation disbursements & statutory clearance progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/reports"
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <span>Download Audit Reports (PDF)</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Acquisition Projects</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_projects}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Multi-state corridors</span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

        {/* Total Land Area */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Land Registered</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats.total_land_area_acres.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-sm font-semibold text-slate-500">Acres</span>
            </div>
            <div className="text-xs text-blue-600 font-medium mt-1">
              {stats.acquired_land_area_acres.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Acres Acquired
            </div>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
        </div>

        {/* Total Compensation Disbursed */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Compensation Disbursed</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              ₹{(stats.paid_compensation / 10000000).toFixed(2)} <span className="text-sm font-semibold text-slate-500">Cr</span>
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              ₹{(stats.total_compensation / 10000000).toFixed(2)} Cr Awarded
            </div>
          </div>
          <div className="p-3 bg-teal-50 text-teal-700 rounded-xl">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Sanctions & Delays */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Approvals</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats.pending_approvals}
            </div>
            <div className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{stats.delayed_projects} delayed projects</span>
            </div>
          </div>
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Charts Section: State Progress & Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* State-wise land acquisition chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">State-wise Registered Land Acreage</h3>
              <p className="text-xs text-slate-500">Comparison of total surveyed area across states</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.state_stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="state" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [`${value} Acres`, 'Land Area']}
                  contentStyle={{ backgroundColor: '#0F2942', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="acres" fill="#0F2942" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Acquisition Status Pie Distribution */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Acquisition Status Distribution</h3>
              <p className="text-xs text-slate-500">Parcels by administrative acquisition stage</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.acq_distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="status"
                >
                  {stats.acq_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} Parcels`, name]}
                  contentStyle={{ backgroundColor: '#0F2942', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Grid: Project Progress Table & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Infrastructure Projects Progress List */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Major Acquisition Corridors</h3>
              <p className="text-xs text-slate-500">Track progress & clearance timeline across key national projects</p>
            </div>
            <Link to="/projects" className="text-xs text-blue-600 font-semibold hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {stats.project_progress.map((p) => (
              <div key={p.id} className="p-4 hover:bg-slate-50 transition">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="font-semibold text-slate-800 truncate max-w-xs">{p.name}</div>
                  <div className="flex items-center gap-2">
                    {p.is_delayed && (
                      <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 rounded">
                        Overdue
                      </span>
                    )}
                    <span className="font-bold text-slate-700">{p.progress}%</span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      p.progress === 100 ? 'bg-emerald-500' : p.is_delayed ? 'bg-amber-500' : 'bg-gov-teal'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, p.progress))}%` }}
                  ></div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>Code: <span className="font-mono text-slate-600">{p.code}</span></span>
                  <StatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Audit Activities */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">System Activity Log</h3>
              <p className="text-xs text-slate-500">Audit trail of verified titles, sanctions & disbursements</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
            {stats.recent_activities.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No activity logs recorded.</div>
            ) : (
              stats.recent_activities.map((act) => (
                <div key={act.id} className="p-3.5 hover:bg-slate-50 transition text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-800">{act.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{act.timestamp}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-snug">{act.details}</p>
                  <div className="text-[10px] text-slate-400 mt-1">Officer: {act.user}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
