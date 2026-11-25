import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Coins, Plus, Search, Filter, CheckCircle, CreditCard,
  Building, User, ArrowUpRight, Calculator, Clock
} from 'lucide-react';

export const CompensationManagement = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [compensations, setCompensations] = useState([]);
  const [projects, setProjects] = useState([]);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [payStatusFilter, setPayStatusFilter] = useState('');
  const [appStatusFilter, setAppStatusFilter] = useState('');

  // Modals
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showDisburseModal, setShowDisburseModal] = useState(false);
  const [activeComp, setActiveComp] = useState(null);
  const [disburseRemarks, setDisburseRemarks] = useState('Direct Benefit Transfer (DBT/PFMS) executed successfully.');
  const [processing, setProcessing] = useState(false);

  // Calculation form
  const [calcForm, setCalcForm] = useState({
    project: '',
    land_parcel: '',
    landowner_name: '',
    land_area_acres: '',
    valuation_rate_per_acre: '',
    solatium_percentage: '100',
    asset_compensation: '0',
    rehabilitation_allowance: '0',
    remarks: '',
  });

  const [preview, setPreview] = useState(null);

  const fetchCompensations = async () => {
    setLoading(true);
    try {
      let query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (payStatusFilter) query.push(`payment_status=${payStatusFilter}`);
      if (appStatusFilter) query.push(`approval_status=${appStatusFilter}`);
      const qs = query.length ? `?${query.join('&')}` : '';

      const res = await api.get(`/compensation/${qs}`);
      setCompensations(res.data.results || res.data || []);
    } catch (err) {
      addToast('Error fetching compensation records', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [pRes, lRes] = await Promise.all([
        api.get('/projects/'),
        api.get('/land/parcels/'),
      ]);
      setProjects(pRes.data.results || pRes.data || []);
      setParcels(lRes.data.results || lRes.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchCompensations();
  }, [search, payStatusFilter, appStatusFilter]);

  // Handle parcel selection in calc form to autofill owner and area
  const handleParcelSelect = (parcelId) => {
    const p = parcels.find(item => String(item.id) === String(parcelId));
    if (p) {
      setCalcForm(prev => ({
        ...prev,
        land_parcel: parcelId,
        landowner_name: p.owner_name,
        land_area_acres: p.area_acres,
        valuation_rate_per_acre: p.market_value_per_acre,
      }));
      updatePreview(p.area_acres, p.market_value_per_acre, calcForm.solatium_percentage, calcForm.asset_compensation, calcForm.rehabilitation_allowance);
    } else {
      setCalcForm(prev => ({ ...prev, land_parcel: parcelId }));
    }
  };

  const updatePreview = async (area, rate, solatium, asset, rehab) => {
    try {
      const res = await api.post('/compensation/calculate-preview/', {
        land_area_acres: area || 0,
        valuation_rate_per_acre: rate || 0,
        solatium_percentage: solatium || 100,
        asset_compensation: asset || 0,
        rehabilitation_allowance: rehab || 0,
      });
      setPreview(res.data);
    } catch (e) {
      // ignore
    }
  };

  const handleFormChange = (field, val) => {
    const updated = { ...calcForm, [field]: val };
    setCalcForm(updated);
    updatePreview(
      updated.land_area_acres,
      updated.valuation_rate_per_acre,
      updated.solatium_percentage,
      updated.asset_compensation,
      updated.rehabilitation_allowance
    );
  };

  const handleCreateCompensation = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/compensation/', calcForm);
      addToast('Compensation award calculated and registered successfully!', 'success');
      setShowCalculateModal(false);
      fetchCompensations();
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to save award';
      addToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisbursePayment = async (e) => {
    e.preventDefault();
    if (!activeComp) return;
    setProcessing(true);
    try {
      const res = await api.post(`/compensation/${activeComp.id}/disburse/`, {
        remarks: disburseRemarks,
      });
      addToast(`Simulated DBT Transfer of ₹${Number(res.data.total_compensation).toLocaleString('en-IN')} successfully executed! UTR: ${res.data.transaction_reference}`, 'success', 6000);
      setShowDisburseModal(false);
      fetchCompensations();
    } catch (err) {
      addToast(err.response?.data?.error || 'Disbursement failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const canDisburse = ['district_officer', 'state_officer', 'national_admin'].includes(user?.role);
  const isLandowner = user?.role === 'landowner';

  // Summary Metrics
  const totalAwarded = compensations.reduce((acc, c) => acc + Number(c.total_compensation || 0), 0);
  const totalDisbursed = compensations.filter(c => c.payment_status === 'Disbursed').reduce((acc, c) => acc + Number(c.total_compensation || 0), 0);
  const pendingAmount = totalAwarded - totalDisbursed;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Statutory Compensation & Direct Benefit Transfer (DBT)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            RFCTLARR Act 2013 calculation engine with mandatory 100% Solatium, asset valuation & simulated PFMS disbursement
          </p>
        </div>
        {!isLandowner && (
          <button
            onClick={() => {
              setCalcForm({
                project: projects[0]?.id || '',
                land_parcel: '',
                landowner_name: '',
                land_area_acres: '',
                valuation_rate_per_acre: '',
                solatium_percentage: '100',
                asset_compensation: '0',
                rehabilitation_allowance: '0',
                remarks: '',
              });
              setPreview(null);
              setShowCalculateModal(true);
            }}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Calculator className="w-4 h-4 text-gov-gold" />
            <span>Calculate New Compensation Award</span>
          </button>
        )}
      </div>

      {/* Metric summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Statutory Awards</div>
          <div className="text-xl font-bold text-slate-900 mt-1">₹{totalAwarded.toLocaleString('en-IN')}</div>
          <div className="text-xs text-slate-500 mt-0.5">{compensations.length} Determinations Announced</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Disbursed (Paid via DBT)</div>
          <div className="text-xl font-bold text-emerald-700 mt-1">₹{totalDisbursed.toLocaleString('en-IN')}</div>
          <div className="text-xs text-emerald-600 font-medium mt-0.5">Direct to Aadhaar Bank Account</div>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending Disbursement</div>
          <div className="text-xl font-bold text-amber-700 mt-1">₹{pendingAmount.toLocaleString('en-IN')}</div>
          <div className="text-xs text-amber-600 font-medium mt-0.5">Awaiting Scheduled PFMS Batch</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search award code, landowner, survey #, project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy"
            />
          </div>

          <select
            value={payStatusFilter}
            onChange={(e) => setPayStatusFilter(e.target.value)}
            className="py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
          >
            <option value="">Payment Status: All</option>
            <option value="Disbursed">Disbursed / Paid (DBT)</option>
            <option value="Approved">Sanctioned & Approved</option>
            <option value="Unprocessed">Unprocessed / Draft</option>
            <option value="On_Hold">On Hold</option>
          </select>

          <select
            value={appStatusFilter}
            onChange={(e) => setAppStatusFilter(e.target.value)}
            className="py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
          >
            <option value="">Award Approval: All</option>
            <option value="Approved">Approved</option>
            <option value="Under_Review">Under Review</option>
            <option value="Draft">Draft</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="text-slate-500 font-medium">
          Total: <span className="font-bold text-slate-800">{compensations.length}</span> Award Records
        </div>
      </div>

      {/* Compensations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading compensation awards & DBT transactions..." />
        ) : compensations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No compensation records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Award ID</th>
                  <th className="py-3.5 px-4">Project & Location</th>
                  <th className="py-3.5 px-4">Beneficiary Landowner</th>
                  <th className="py-3.5 px-4">Base Land Value</th>
                  <th className="py-3.5 px-4">100% Solatium</th>
                  <th className="py-3.5 px-4">Total Statutory Award</th>
                  <th className="py-3.5 px-4">Payment Status</th>
                  <th className="py-3.5 px-4">Transaction UTR</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {compensations.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-gov-navy font-mono">
                      {c.compensation_code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 line-clamp-1 max-w-[150px]">{c.project_name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Survey #{c.survey_number} • {c.village}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.landowner_name}</div>
                      <div className="text-[10px] text-slate-400">{c.land_area_acres} Acres @ ₹{Number(c.valuation_rate_per_acre).toLocaleString('en-IN')}/ac</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium">
                      ₹{Number(c.base_land_value).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono text-emerald-700 font-medium">
                      +₹{Number(c.solatium_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-[13px]">
                      ₹{Number(c.total_compensation).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={c.payment_status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {c.transaction_reference ? (
                        <div className="text-emerald-700 font-semibold truncate max-w-[130px]" title={c.transaction_reference}>
                          {c.transaction_reference}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Not disbursed</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {canDisburse && c.payment_status !== 'Disbursed' && (
                        <button
                          onClick={() => {
                            setActiveComp(c);
                            setDisburseRemarks('Direct Benefit Transfer (DBT/PFMS) executed successfully.');
                            setShowDisburseModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm transition inline-flex items-center gap-1"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Disburse (DBT)</span>
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

      {/* Modal: Calculate New Compensation Award */}
      <Modal
        isOpen={showCalculateModal}
        onClose={() => setShowCalculateModal(false)}
        title="Statutory Compensation Assessment (RFCTLARR Act 2013)"
        subtitle="Mandated calculation with circle rates, 100% solatium, and rehabilitation package"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateCompensation} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Acquisition Project *</label>
              <select
                required
                value={calcForm.project}
                onChange={(e) => handleFormChange('project', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.project_code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Registered Land Parcel *</label>
              <select
                required
                value={calcForm.land_parcel}
                onChange={(e) => handleParcelSelect(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">Select Parcel</option>
                {parcels.map((p) => (
                  <option key={p.id} value={p.id}>
                    Survey #{p.survey_number} - {p.village} ({p.owner_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Landowner / Beneficiary Name *</label>
              <input
                type="text"
                required
                value={calcForm.landowner_name}
                onChange={(e) => handleFormChange('landowner_name', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Acquired Land Area (Acres) *</label>
              <input
                type="number"
                step="0.001"
                required
                value={calcForm.land_area_acres}
                onChange={(e) => handleFormChange('land_area_acres', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Circle Rate / Market Valuation (₹/Acre) *</label>
              <input
                type="number"
                required
                value={calcForm.valuation_rate_per_acre}
                onChange={(e) => handleFormChange('valuation_rate_per_acre', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Statutory Solatium Rate (%) *</label>
              <input
                type="number"
                required
                value={calcForm.solatium_percentage}
                onChange={(e) => handleFormChange('solatium_percentage', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standing Asset / Structure Damages (₹)</label>
              <input
                type="number"
                value={calcForm.asset_compensation}
                onChange={(e) => handleFormChange('asset_compensation', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Rehabilitation & Resettlement (₹)</label>
              <input
                type="number"
                value={calcForm.rehabilitation_allowance}
                onChange={(e) => handleFormChange('rehabilitation_allowance', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Remarks & Award Notes</label>
              <input
                type="text"
                placeholder="Section 30 award declaration notes..."
                value={calcForm.remarks}
                onChange={(e) => handleFormChange('remarks', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

          </div>

          {/* Live Preview Box */}
          {preview && (
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 mt-4 font-mono">
              <div className="text-xs uppercase font-bold text-gov-gold tracking-wider">
                Computed Statutory Breakdown
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Base Value: ₹{Number(preview.base_land_value).toLocaleString('en-IN')}</div>
                <div className="text-emerald-400">100% Solatium: +₹{Number(preview.solatium_amount).toLocaleString('en-IN')}</div>
                <div>Assets & Crops: ₹{Number(preview.asset_compensation).toLocaleString('en-IN')}</div>
                <div>R&R Allowance: ₹{Number(preview.rehabilitation_allowance).toLocaleString('en-IN')}</div>
              </div>
              <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-sm font-bold text-white">
                <span>TOTAL COMPENSATION AWARD:</span>
                <span className="text-emerald-400 text-base">₹{Number(preview.total_compensation).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowCalculateModal(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processing}
              className="px-4 py-2 bg-gov-navy text-white rounded-lg hover:bg-slate-800 transition font-medium"
            >
              {processing ? 'Registering...' : 'Save Compensation Award'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Simulated DBT Disbursement */}
      {activeComp && (
        <Modal
          isOpen={showDisburseModal}
          onClose={() => setShowDisburseModal(false)}
          title={`Execute Direct Benefit Transfer (DBT): ${activeComp.compensation_code}`}
          subtitle={`Beneficiary: ${activeComp.landowner_name} | Amount: ₹${Number(activeComp.total_compensation).toLocaleString('en-IN')}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleDisbursePayment} className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Simulated PFMS / RBI Banking Gateway</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Execution simulates an instant direct credit to the beneficiary's registered Aadhaar-linked bank account ({activeComp.bank_account_masked}). A unique PFMS UTR reference will be generated and logged.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Disbursement Remarks / Reference Note</label>
              <textarea
                rows={2}
                value={disburseRemarks}
                onChange={(e) => setDisburseRemarks(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDisburseModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition font-medium flex items-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>{processing ? 'Processing DBT...' : 'Execute DBT Transfer'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default CompensationManagement;
