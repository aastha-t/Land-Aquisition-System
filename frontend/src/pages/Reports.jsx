import React, { useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import {
  FileText, Download, CheckCircle, ShieldCheck,
  FolderKanban, MapPin, Coins, GitPullRequest, BarChart2
} from 'lucide-react';

export const Reports = () => {
  const { addToast } = useToast();
  const [downloading, setDownloading] = useState('');

  const handleDownload = async (type, title) => {
    setDownloading(type);
    try {
      const response = await api.get(`/analytics/reports/pdf/?type=${type}`, {
        responseType: 'blob',
      });
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_Official_Report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast(`${title} generated and downloaded successfully!`, 'success');
    } catch (err) {
      addToast('Failed to download PDF report', 'error');
    } finally {
      setDownloading('');
    }
  };

  const reportsList = [
    {
      id: 'projects',
      title: 'National Acquisition Projects Summary Report',
      description: 'Comprehensive statutory report of all highway, railway, airport, and industrial acquisition corridors, deadlines, budgets, and acreage.',
      icon: FolderKanban,
      badge: 'Executive Corridor Audit',
    },
    {
      id: 'land_records',
      title: 'Cadastral Land Records & Title Inventory',
      description: 'Official schedule of registered survey numbers, village jurisdictions, land classifications, market circle rates, and owner identity verifications.',
      icon: MapPin,
      badge: 'Survey & Title Registry',
    },
    {
      id: 'compensation',
      title: 'Compensation Awards & Disbursement Audit Log',
      description: 'Statutory RFCTLARR Act 2013 breakdown including base land values, 100% Solatium awards, asset damages, and PFMS DBT transaction references.',
      icon: Coins,
      badge: 'PFMS / DBT Financial Audit',
    },
    {
      id: 'approvals',
      title: 'Administrative Clearances & Sanctions Log',
      description: 'Multi-stage decision audit trail from Department Officers through District Collectors to National Land Acquisition Authorities.',
      icon: GitPullRequest,
      badge: 'Governance Workflow Log',
    },
    {
      id: 'district_stats',
      title: 'District-Wise Statistical Land Acquisition Report',
      description: 'Regional analytical audit comparing surveyed acreage, acquired areas, and total financial compensation disbursed across all 10 districts.',
      icon: BarChart2,
      badge: 'Regional Performance',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Official Audit Reports & Digital PDF Generation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Download vector PDF audit files generated using Python ReportLab engine for academic evaluation and governance decision support
          </p>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {reportsList.map((rep) => {
          const Icon = rep.icon;
          const isCurrentDownloading = downloading === rep.id;

          return (
            <div
              key={rep.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-gov-navy">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {rep.badge}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 leading-snug mb-2">
                  {rep.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  {rep.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isCurrentDownloading}
                  onClick={() => handleDownload(rep.id, rep.title)}
                  className="w-full py-2 px-3 bg-gov-navy hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4 text-gov-gold" />
                  <span>{isCurrentDownloading ? 'Compiling PDF...' : 'Download Official PDF'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Notice box */}
      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <ShieldCheck className="w-5 h-5 text-gov-teal shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-slate-800">Direct Local Vector PDF Generation</span>
          <p className="mt-0.5">
            All PDF reports are generated server-side using Python ReportLab with official Government of India formatting, tabulated records and digital audit timestamps. No external cloud PDF APIs are utilized.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Reports;
