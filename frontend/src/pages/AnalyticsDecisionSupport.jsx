import React, { useState, useEffect } from 'react';
import api from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  BarChart3, AlertTriangle, Lightbulb, ShieldAlert,
  ArrowRight, CheckCircle2, TrendingUp, Building, MapPin, ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AnalyticsDecisionSupport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/decision-support/');
        setData(res.data);
      } catch (err) {
        console.error('Error fetching decision analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <LoadingSpinner label="Running rule-based decision support heuristics & corridor delay analysis..." />;
  if (!data) return <div className="p-8 text-center text-rose-600">Failed to load analytics engine.</div>;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Analytics & Autonomous Decision Support Engine
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Rule-driven corridor delay prediction, administrative bottleneck alerts & statutory recommendation matrix
          </p>
        </div>
        <Link
          to="/reports"
          className="px-3.5 py-2 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Export Analytics to PDF</span>
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      {/* Automated Real-Time Alerts Banner */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h3 className="font-bold text-sm text-slate-900">Automated System Alerts & Clearance Bottlenecks</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
            {data.alerts.length} Detected
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.alerts.map((alt) => (
            <div
              key={alt.id}
              className={`p-4 rounded-xl border flex items-start gap-3 transition shadow-sm ${
                alt.type === 'danger'
                  ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                  : 'bg-amber-50/60 border-amber-200 text-amber-950'
              }`}
            >
              <div className={`p-2 rounded-lg shrink-0 ${alt.type === 'danger' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-slate-900">{alt.title}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/80 border text-slate-600">
                    {alt.category}
                  </span>
                </div>
                <p className="text-slate-600 leading-snug mt-1">{alt.message}</p>
                {alt.link && (
                  <Link
                    to={alt.link}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:underline mt-2"
                  >
                    <span>{alt.action_label}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Rule-Based Recommendations Matrix */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-gov-gold" />
          <div>
            <h3 className="font-bold text-sm text-slate-900">Statutory Recommendation Matrix (RFCTLARR Heuristics)</h3>
            <p className="text-xs text-slate-500">Autonomous business rules applied to current corridor status & backlog data</p>
          </div>
        </div>

        <div className="space-y-3">
          {data.recommendations.map((rec, i) => (
            <div key={i} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 flex items-start gap-3 text-xs">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 mt-0.5 ${
                rec.priority === 'High' ? 'bg-rose-100 text-rose-800' : rec.priority === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {rec.priority} Priority
              </span>
              <div>
                <div className="font-bold text-slate-900 mb-0.5">{rec.title}</div>
                <div className="text-slate-600 leading-relaxed">{rec.recommendation}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* District-wise Statistics Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-sm text-slate-900">District-Wise Cadastral Acquisition Performance</h3>
          <p className="text-xs text-slate-500">Cross-district comparison of registered land parcels, verified acreage & backlog</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">District</th>
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4">Surveyed Parcels</th>
                <th className="py-3 px-4">Total Area (Acres)</th>
                <th className="py-3 px-4">Acquired Area (Acres)</th>
                <th className="py-3 px-4">Title Clearance Rate</th>
                <th className="py-3 px-4">Verification Backlog</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.districts_data.map((d, index) => {
                const rate = d.total_acres > 0 ? Math.round((d.acquired_acres / d.total_acres) * 100) : 0;
                return (
                  <tr key={index} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{d.district}</td>
                    <td className="py-3 px-4 text-slate-600">{d.state}</td>
                    <td className="py-3 px-4 font-mono">{d.parcels}</td>
                    <td className="py-3 px-4 font-mono font-medium">{d.total_acres.toFixed(2)}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-emerald-700">{d.acquired_acres.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-gov-teal h-full rounded-full" style={{ width: `${rate}%` }}></div>
                        </div>
                        <span className="font-mono font-semibold">{rate}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {d.pending_verification > 0 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          {d.pending_verification} pending
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 100% Cleared
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default AnalyticsDecisionSupport;
