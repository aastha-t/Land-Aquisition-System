import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  MessageSquareWarning, Plus, Search, Filter, CheckCircle2,
  Clock, ShieldAlert, FileText, User
} from 'lucide-react';

export const Grievances = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [activeGrievance, setActiveGrievance] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    subject: '',
    category: 'Compensation Delay',
    description: '',
  });

  const [updateStatus, setUpdateStatus] = useState('Under_Review');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchGrievances = async () => {
    setLoading(true);
    try {
      let query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (statusFilter) query.push(`status=${statusFilter}`);
      if (categoryFilter) query.push(`category=${categoryFilter}`);
      const qs = query.length ? `?${query.join('&')}` : '';

      const res = await api.get(`/grievances/${qs}`);
      setGrievances(res.data.results || res.data || []);
    } catch (err) {
      addToast('Error fetching grievances', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrievances();
  }, [search, statusFilter, categoryFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/grievances/', createForm);
      addToast('Citizen grievance registered successfully with ticket ID!', 'success');
      setShowCreateModal(false);
      setCreateForm({
        subject: '',
        category: 'Compensation Delay',
        description: '',
      });
      fetchGrievances();
    } catch (err) {
      addToast('Error submitting grievance', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusSubmit = async (e) => {
    e.preventDefault();
    if (!activeGrievance) return;
    setProcessing(true);
    try {
      await api.post(`/grievances/${activeGrievance.id}/update-status/`, {
        status: updateStatus,
        remarks: updateRemarks,
      });
      addToast(`Grievance ${activeGrievance.grievance_code} updated to ${updateStatus}!`, 'success');
      setShowStatusModal(false);
      fetchGrievances();
    } catch (err) {
      addToast('Failed to update grievance', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const isLandowner = user?.role === 'landowner';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Citizen Grievance Redressal Mechanism
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Transparent dispute tracking, compensation inquiries, valuation appeals & official resolution notes
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Lodge Citizen Grievance</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search grievance code, subject, citizen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
          >
            <option value="">Status: All</option>
            <option value="Submitted">Submitted by Citizen</option>
            <option value="Under_Review">Under Administrative Scrutiny</option>
            <option value="Action_Taken">Field Action Taken</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
          >
            <option value="">Grievance Category: All</option>
            <option value="Compensation Delay">Compensation Delay</option>
            <option value="Valuation Dispute">Valuation Dispute</option>
            <option value="Ownership Conflict">Ownership Conflict</option>
            <option value="Project Delay">Project Delay</option>
            <option value="Document Issue">Document Issue</option>
          </select>
        </div>

        <div className="text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{grievances.length}</span> Grievances
        </div>
      </div>

      {/* Grievances Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading grievance redressal cases..." />
        ) : grievances.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No grievances matching selected criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Ticket ID</th>
                  <th className="py-3.5 px-4">Subject & Description</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Petitioner / Citizen</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Officer Action Remarks</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grievances.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-gov-navy font-mono">
                      {g.grievance_code}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      <div className="font-semibold text-slate-900">{g.subject}</div>
                      <p className="text-slate-500 text-[11px] line-clamp-2 mt-0.5">{g.description}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {g.category_display}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium">{g.landowner_name || g.landowner_username}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{g.landowner_phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={g.status} />
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {g.resolution_remarks ? (
                        <div>
                          <div className="text-slate-800 italic">"{g.resolution_remarks}"</div>
                          {g.resolved_by_name && (
                            <div className="text-[10px] text-slate-400">By {g.resolved_by_name}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pending inquiry</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {!isLandowner && (
                        <button
                          onClick={() => {
                            setActiveGrievance(g);
                            setUpdateStatus(g.status === 'Submitted' ? 'Under_Review' : g.status);
                            setUpdateRemarks(g.resolution_remarks || '');
                            setShowStatusModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-gov-navy bg-slate-100 hover:bg-slate-200 rounded-md transition"
                        >
                          Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Lodge New Grievance */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Lodge Citizen Grievance / Appeal"
        subtitle="Submit compensation dispute, survey re-measurement request or procedural delay appeal"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Subject *</label>
            <input
              type="text"
              required
              placeholder="e.g. Delay in compensation payment for Survey #104/2B"
              value={createForm.subject}
              onChange={(e) => setCreateForm({ ...createForm, subject: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Grievance Category *</label>
            <select
              value={createForm.category}
              onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
            >
              <option value="Compensation Delay">Compensation Disbursement Delay</option>
              <option value="Valuation Dispute">Land Valuation & Circle Rate Dispute</option>
              <option value="Ownership Conflict">Title & Ownership Verification Conflict</option>
              <option value="Project Delay">Project Delay & Livelihood Impact</option>
              <option value="Document Issue">Document Rejection / Boundary Dispute</option>
              <option value="Other">Other Grievance / Inconvenience</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Detailed Description *</label>
            <textarea
              required
              rows={4}
              placeholder="Provide exact details of the issue, survey number, Tehsil name, bank details, or affected assets..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-4 py-2 bg-gov-navy text-white rounded-lg hover:bg-slate-800 transition font-medium"
            >
              {processing ? 'Registering...' : 'Lodge Grievance'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Officer Update Status */}
      {activeGrievance && (
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title={`Redressal Action: ${activeGrievance.grievance_code}`}
          subtitle={`Citizen: ${activeGrievance.landowner_name} | ${activeGrievance.subject}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleStatusSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Administrative Redressal Status *</label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="Under_Review">Under Administrative Scrutiny</option>
                <option value="Action_Taken">Field Inquiry & Action Taken</option>
                <option value="Resolved">Grievance Resolved</option>
                <option value="Closed">Matter Closed</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Officer Action / Resolution Remarks *</label>
              <textarea
                required
                rows={4}
                placeholder="Enter actions taken, field inquiry findings, dispatch date or resolution details to notify citizen..."
                value={updateRemarks}
                onChange={(e) => setUpdateRemarks(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-gov-navy text-white rounded-lg hover:bg-slate-800 transition font-medium"
              >
                {processing ? 'Updating...' : 'Save Resolution'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default Grievances;
