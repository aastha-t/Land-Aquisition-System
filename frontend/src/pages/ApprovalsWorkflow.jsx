import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  GitPullRequest, Plus, Search, Filter, CheckCircle, XCircle,
  Clock, ArrowRight, ShieldCheck, History, AlertCircle
} from 'lucide-react';

export const ApprovalsWorkflow = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [pendingMyRoleOnly, setPendingMyRoleOnly] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeApproval, setActiveApproval] = useState(null);

  // Process form
  const [decision, setDecision] = useState('approve');
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    title: '',
    entity_type: 'Project',
    entity_id: '1',
    entity_name: '',
    details_summary: '',
    priority: 'Normal',
  });

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      let query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (statusFilter) query.push(`status=${statusFilter}`);
      if (stageFilter) query.push(`stage=${stageFilter}`);
      if (pendingMyRoleOnly) query.push(`pending_my_role=true`);
      const qs = query.length ? `?${query.join('&')}` : '';

      const res = await api.get(`/approvals/${qs}`);
      setApprovals(res.data.results || res.data || []);
    } catch (err) {
      addToast('Error fetching approvals', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [search, statusFilter, stageFilter, pendingMyRoleOnly]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/approvals/', createForm);
      addToast('Approval request submitted into workflow!', 'success');
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        entity_type: 'Project',
        entity_id: '1',
        entity_name: '',
        details_summary: '',
        priority: 'Normal',
      });
      fetchApprovals();
    } catch (err) {
      addToast('Error submitting approval request', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessSubmit = async (e) => {
    e.preventDefault();
    if (!activeApproval) return;
    setProcessing(true);
    try {
      await api.post(`/approvals/${activeApproval.id}/process/`, {
        decision,
        remarks,
      });
      addToast(`Approval request ${decision === 'approve' ? 'forwarded / approved' : 'rejected'}!`, 'success');
      setShowProcessModal(false);
      fetchApprovals();
    } catch (err) {
      addToast(err.response?.data?.error || 'Action failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const isLandowner = user?.role === 'landowner';

  const canActOnApproval = (app) => {
    if (app.status !== 'Pending') return false;
    if (user?.role === 'national_admin') return true;
    return user?.role === app.current_stage;
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Multi-Tier Statutory Clearance & Approval Workflow
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Sequential governance approval pipeline: Department Officer → District Collector → State Officer → National Administrator
          </p>
        </div>
        {!isLandowner && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Approval Request</span>
          </button>
        )}
      </div>

      {/* Visual Workflow Pipeline Banner */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <div className="min-w-[650px] flex items-center justify-between text-xs">
          {[
            { step: '1', role: 'Department Officer', desc: 'Prepares & Submits Proposal' },
            { step: '2', role: 'District Collector', desc: 'Title & Circle Rate Sanction' },
            { step: '3', role: 'State Officer', desc: 'Revenue Dept Financial Clearance' },
            { step: '4', role: 'National Administrator', desc: 'Final Gazette Sanction & DBT' },
          ].map((st, idx) => (
            <React.Fragment key={st.step}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-gov-navy text-white font-bold flex items-center justify-center shrink-0">
                  {st.step}
                </div>
                <div>
                  <div className="font-bold text-slate-900">{st.role}</div>
                  <div className="text-[10px] text-slate-400">{st.desc}</div>
                </div>
              </div>
              {idx < 3 && <ArrowRight className="w-5 h-5 text-slate-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search code, title, initiator..."
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
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
          >
            <option value="">Clearance Stage: All</option>
            <option value="department_officer">Department Officer</option>
            <option value="district_officer">District Officer / Collector</option>
            <option value="state_officer">State Revenue Officer</option>
            <option value="national_admin">National Administrator</option>
            <option value="approved">Fully Approved</option>
          </select>

          {!isLandowner && (
            <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={pendingMyRoleOnly}
                onChange={(e) => setPendingMyRoleOnly(e.target.checked)}
                className="w-4 h-4 text-gov-navy rounded border-slate-300"
              />
              <span className="text-blue-700">Requires My Action Only</span>
            </label>
          )}
        </div>

        <div className="text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{approvals.length}</span> Requests
        </div>
      </div>

      {/* Approvals Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading administrative approval workflow requests..." />
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No approval requests matching filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Approval Code</th>
                  <th className="py-3.5 px-4">Request Title</th>
                  <th className="py-3.5 px-4">Entity Type</th>
                  <th className="py-3.5 px-4">Current Clearance Stage</th>
                  <th className="py-3.5 px-4">Priority</th>
                  <th className="py-3.5 px-4">Initiator</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {approvals.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-gov-navy font-mono">
                      {app.approval_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 max-w-xs">{app.title}</div>
                      {app.entity_name && (
                        <div className="text-[10px] text-slate-400 font-mono">{app.entity_name}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {app.entity_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gov-navy">{app.current_stage_display}</div>
                      {app.status === 'Pending' && (
                        <div className="text-[10px] text-amber-600 font-medium">Pending Sanction</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        app.priority === 'Urgent' ? 'bg-rose-100 text-rose-800' : app.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {app.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{app.requested_by_name || app.requested_by_username}</div>
                      <div className="text-[10px] text-slate-400">{new Date(app.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {/* View History Audit */}
                      <button
                        onClick={() => { setActiveApproval(app); setShowHistoryModal(true); }}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition inline-flex items-center gap-1"
                        title="View Workflow Audit Timeline"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Audit Trail</span>
                      </button>

                      {/* Process Decision Action */}
                      {canActOnApproval(app) && (
                        <button
                          onClick={() => {
                            setActiveApproval(app);
                            setDecision('approve');
                            setRemarks('');
                            setShowProcessModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-md shadow-sm transition inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-gov-gold" />
                          <span>Review & Act</span>
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

      {/* Modal: Submit New Approval */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Initiate Administrative Approval Request"
        subtitle="Forward land acquisition file or compensation sanction to Collectorate & State Revenue"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Request Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Sanction of Award for Jewar Airport Sector 2"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Entity Type *</label>
              <select
                value={createForm.entity_type}
                onChange={(e) => setCreateForm({ ...createForm, entity_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="Project">Acquisition Project</option>
                <option value="Compensation">Compensation Award</option>
                <option value="LandParcel">Land Parcel</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="Normal">Normal</option>
                <option value="High">High Priority</option>
                <option value="Urgent">Urgent / Fast-Track</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Entity Name / Reference</label>
            <input
              type="text"
              placeholder="e.g. Project DFCCIL-GJ-2026-04 or CMP-2026-002"
              value={createForm.entity_name}
              onChange={(e) => setCreateForm({ ...createForm, entity_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Summary Details & Justification *</label>
            <textarea
              required
              rows={3}
              placeholder="Enter statutory justification, gazette notification details or survey report synopsis..."
              value={createForm.details_summary}
              onChange={(e) => setCreateForm({ ...createForm, details_summary: e.target.value })}
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
              {processing ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Process Approval */}
      {activeApproval && (
        <Modal
          isOpen={showProcessModal}
          onClose={() => setShowProcessModal(false)}
          title={`Administrative Action: ${activeApproval.approval_code}`}
          subtitle={activeApproval.title}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleProcessSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-800">Clearance Stage: {activeApproval.current_stage_display}</div>
              <p className="text-slate-600 mt-1 leading-relaxed">{activeApproval.details_summary}</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Decision *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDecision('approve')}
                  className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 transition ${
                    decision === 'approve'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Sanction & Forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('reject')}
                  className={`py-2 px-3 rounded-lg border font-semibold flex items-center justify-center gap-2 transition ${
                    decision === 'reject'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Disapprove / Reject</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Officer Sanction Remarks *</label>
              <textarea
                required
                rows={3}
                placeholder="Enter official grounds of clearance, verification findings or rejection reasons..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowProcessModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-gov-navy text-white rounded-lg hover:bg-slate-800 transition font-medium"
              >
                {processing ? 'Processing...' : 'Confirm Decision'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: View History Audit Trail */}
      {activeApproval && (
        <Modal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          title={`Approval Audit Trail: ${activeApproval.approval_code}`}
          subtitle={activeApproval.title}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">Current Workflow Status</span>
                <StatusBadge status={activeApproval.status} />
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold">Active Clearance Stage</span>
                <span className="font-bold text-gov-navy">{activeApproval.current_stage_display}</span>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activeApproval.history?.map((h, i) => (
                <div key={h.id || i} className="relative">
                  {/* Dot */}
                  <div className={`absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white ${
                    h.action.includes('Approved') || h.action === 'Final_Approved'
                      ? 'bg-emerald-500'
                      : h.action === 'Rejected'
                      ? 'bg-rose-500'
                      : 'bg-blue-500'
                  }`}></div>
                  
                  <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-slate-900">{h.action_by_name || h.action_by_username} ({h.action_by_role})</span>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(h.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="font-semibold text-gov-navy text-[11px] mb-1">
                      Action: {h.action.replace(/_/g, ' ')}
                    </div>
                    <p className="text-slate-600 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                      "{h.remarks}"
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};

export default ApprovalsWorkflow;
