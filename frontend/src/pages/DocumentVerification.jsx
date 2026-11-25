import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  FileCheck2, CheckCircle, XCircle, Search, Filter,
  FileText, ExternalLink, Calendar, User
} from 'lucide-react';

export const DocumentVerification = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const [activeDoc, setActiveDoc] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [decisionStatus, setDecisionStatus] = useState('Approved');
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      let query = [];
      if (statusFilter) query.push(`status=${statusFilter}`);
      const qs = query.length ? `?${query.join('&')}` : '';
      const res = await api.get(`/land/documents/${qs}`);
      setDocuments(res.data.results || res.data || []);
    } catch (err) {
      addToast('Error fetching verification documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!activeDoc) return;
    setProcessing(true);
    try {
      await api.post(`/land/documents/${activeDoc.id}/verify/`, {
        status: decisionStatus,
        remarks: remarks,
      });
      addToast(`Document '${activeDoc.title}' marked as ${decisionStatus}!`, 'success');
      setShowVerifyModal(false);
      fetchDocuments();
    } catch (err) {
      addToast(err.response?.data?.error || 'Verification failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filteredDocs = documents.filter((d) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        (d.parcel_survey && d.parcel_survey.toLowerCase().includes(q)) ||
        (d.parcel_village && d.parcel_village.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const canVerify = ['district_officer', 'state_officer', 'national_admin'].includes(user?.role);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Document Verification & Title Scrutiny
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            District Collectorate review of ownership certificates, survey sketches & identity proofs
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search document title, survey #, village..."
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
            <option value="">Verification Status: All</option>
            <option value="Pending">Pending Scrutiny</option>
            <option value="Approved">Approved / Cleared</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredDocs.length}</span> documents
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading title documentation for verification..." />
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No verification documents matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Document Title</th>
                  <th className="py-3.5 px-4">Document Category</th>
                  <th className="py-3.5 px-4">Land Parcel (Survey #)</th>
                  <th className="py-3.5 px-4">Uploaded By</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Scrutiny Remarks</th>
                  <th className="py-3.5 px-4">Verified By</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>{doc.title}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.document_type_display}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gov-navy font-mono">Survey #{doc.parcel_survey}</div>
                      <div className="text-[10px] text-slate-400">{doc.parcel_village}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{doc.uploaded_by_name || 'System'}</div>
                      <div className="text-[10px] text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={doc.verification_status} />
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {doc.remarks || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doc.verified_by_name ? (
                        <div>
                          <div className="font-medium text-slate-900">{doc.verified_by_name}</div>
                          <div className="text-[10px] text-slate-400">{new Date(doc.verified_at).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Pending officer</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      <a
                        href={doc.document_file}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View</span>
                      </a>

                      {canVerify && (
                        <button
                          onClick={() => {
                            setActiveDoc(doc);
                            setDecisionStatus(doc.verification_status === 'Approved' ? 'Approved' : 'Approved');
                            setRemarks(doc.remarks || '');
                            setShowVerifyModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition inline-flex items-center gap-1"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Scrutiny</span>
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

      {/* Modal: Process Verification */}
      {activeDoc && (
        <Modal
          isOpen={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          title={`Administrative Document Scrutiny: ${activeDoc.title}`}
          subtitle={`Survey #${activeDoc.parcel_survey} | ${activeDoc.parcel_village}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scrutiny Decision *</label>
              <select
                value={decisionStatus}
                onChange={(e) => setDecisionStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="Approved">Approve Title Document (Clear & Validated)</option>
                <option value="Rejected">Reject Document (Discrepancy / Incomplete Record)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Officer Remarks & Findings *</label>
              <textarea
                required
                rows={3}
                placeholder="Enter revenue findings, cross-verification with Tehsil records..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowVerifyModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-gov-navy text-white rounded-lg hover:bg-slate-800 transition font-medium"
              >
                {processing ? 'Saving...' : 'Record Decision'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default DocumentVerification;
