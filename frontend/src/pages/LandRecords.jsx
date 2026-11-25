import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Search, Plus, Filter, Eye, CheckCircle, XCircle,
  FileText, Upload, MapPin, Edit3
} from 'lucide-react';

export const LandRecords = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [parcels, setParcels] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedVerStatus, setSelectedVerStatus] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [activeParcel, setActiveParcel] = useState(null);

  // Verification form
  const [verifyStatus, setVerifyStatus] = useState('Verified');
  const [verifyRemarks, setVerifyRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  // Document upload form
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('ownership_certificate');
  const [docFile, setDocFile] = useState(null);

  // Create/Edit form
  const [formData, setFormData] = useState({
    survey_number: '',
    state: '',
    district: '',
    sub_division_taluk: '',
    village: '',
    area_acres: '',
    land_type: 'Agricultural',
    market_value_per_acre: '2500000',
    latitude: '18.5204',
    longitude: '73.8567',
    owner_name: '',
    owner_contact: '',
    owner_aadhaar: '',
  });

  const fetchStates = async () => {
    try {
      const res = await api.get('/land/states/');
      setStates(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDistricts = async (stateId) => {
    try {
      const url = stateId ? `/land/districts/?state=${stateId}` : '/land/districts/';
      const res = await api.get(url);
      setDistricts(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchParcels = async () => {
    setLoading(true);
    try {
      let query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (selectedState) query.push(`state=${selectedState}`);
      if (selectedDistrict) query.push(`district=${selectedDistrict}`);
      if (selectedStatus) query.push(`acquisition_status=${selectedStatus}`);
      if (selectedVerStatus) query.push(`verification_status=${selectedVerStatus}`);

      const qs = query.length ? `?${query.join('&')}` : '';
      const res = await api.get(`/land/parcels/${qs}`);
      setParcels(res.data.results || res.data || []);
    } catch (err) {
      addToast('Error fetching land records', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStates();
    fetchDistricts();
  }, []);

  useEffect(() => {
    fetchParcels();
  }, [search, selectedState, selectedDistrict, selectedStatus, selectedVerStatus]);

  const handleStateFilterChange = (e) => {
    const sId = e.target.value;
    setSelectedState(sId);
    setSelectedDistrict('');
    fetchDistricts(sId);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/land/parcels/', formData);
      addToast(`Land Parcel #${formData.survey_number} registered successfully!`, 'success');
      setShowCreateModal(false);
      fetchParcels();
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to register land parcel';
      addToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!activeParcel) return;
    setProcessing(true);
    try {
      await api.post(`/land/parcels/${activeParcel.id}/verify/`, {
        status: verifyStatus,
        remarks: verifyRemarks,
      });
      addToast(`Parcel #${activeParcel.survey_number} marked as ${verifyStatus}!`, 'success');
      setShowVerifyModal(false);
      fetchParcels();
    } catch (err) {
      addToast(err.response?.data?.error || 'Verification failed', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!activeParcel || !docFile) {
      addToast('Please select a file to upload', 'error');
      return;
    }
    setProcessing(true);
    try {
      const fd = new FormData();
      fd.append('land_parcel', activeParcel.id);
      fd.append('title', docTitle);
      fd.append('document_type', docType);
      fd.append('document_file', docFile);

      await api.post('/land/documents/', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      addToast('Document uploaded successfully!', 'success');
      setShowUploadModal(false);
      setDocTitle('');
      setDocFile(null);
      fetchParcels();
    } catch (err) {
      addToast('Error uploading document', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const canVerify = ['district_officer', 'state_officer', 'national_admin'].includes(user?.role);
  const isLandowner = user?.role === 'landowner';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Cadastral Land Records & Title Registry
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Register, search, verify and audit cadastral survey numbers & ownership records
          </p>
        </div>
        {!isLandowner && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Land Parcel</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search survey #, owner, village..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy"
            />
          </div>

          {/* State */}
          <div>
            <select
              value={selectedState}
              onChange={handleStateFilterChange}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
            >
              <option value="">All States</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* District */}
          <div>
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
            >
              <option value="">All Districts</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Acquisition Status */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
            >
              <option value="">Acquisition Status: All</option>
              <option value="Available">Available</option>
              <option value="In_Acquisition">Under Acquisition</option>
              <option value="Acquired">Acquired</option>
              <option value="Disputed">Disputed</option>
            </select>
          </div>

          {/* Title Verification Status */}
          <div>
            <select
              value={selectedVerStatus}
              onChange={(e) => setSelectedVerStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
            >
              <option value="">Title Verification: All</option>
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

        </div>
      </div>

      {/* Parcels Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading land parcel records..." />
        ) : parcels.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No land parcels matching the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Survey #</th>
                  <th className="py-3.5 px-4">Owner Name</th>
                  <th className="py-3.5 px-4">Village & District</th>
                  <th className="py-3.5 px-4">Land Type</th>
                  <th className="py-3.5 px-4">Area (Acres)</th>
                  <th className="py-3.5 px-4">Market Circle Rate</th>
                  <th className="py-3.5 px-4">Title Verification</th>
                  <th className="py-3.5 px-4">Acquisition Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcels.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-gov-navy font-mono">
                      {p.survey_number}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div>{p.owner_name}</div>
                      {p.owner_aadhaar && (
                        <div className="text-[10px] text-slate-400 font-mono">UID: {p.owner_aadhaar}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{p.village}</div>
                      <div className="text-[11px] text-slate-400">{p.district_name}, {p.state_name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-slate-600">{p.land_type}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 font-mono">
                      {p.area_acres} <span className="text-[10px] text-slate-400 font-normal">({p.area_sq_meters} m²)</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      ₹{Number(p.market_value_per_acre).toLocaleString('en-IN')}/acre
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.verification_status} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={p.acquisition_status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {/* View Details */}
                      <button
                        onClick={() => { setActiveParcel(p); setShowDetailModal(true); }}
                        className="p-1.5 text-slate-600 hover:text-gov-navy hover:bg-slate-100 rounded-md transition"
                        title="View Land Parcel Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Upload Document */}
                      <button
                        onClick={() => { setActiveParcel(p); setShowUploadModal(true); }}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-md transition"
                        title="Upload Ownership Document"
                      >
                        <Upload className="w-4 h-4" />
                      </button>

                      {/* Verify Action for Officers */}
                      {canVerify && p.verification_status === 'Pending' && (
                        <button
                          onClick={() => {
                            setActiveParcel(p);
                            setVerifyStatus('Verified');
                            setVerifyRemarks('');
                            setShowVerifyModal(true);
                          }}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-md transition"
                          title="Verify Title Records"
                        >
                          <CheckCircle className="w-4 h-4" />
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

      {/* Modal: Register New Land Parcel */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Register New Cadastral Land Parcel"
        subtitle="Enter legal land survey boundaries, owner information and GPS coordinates"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Survey / Gat Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 142/3A"
                value={formData.survey_number}
                onChange={(e) => setFormData({ ...formData, survey_number: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">State *</label>
              <select
                required
                value={formData.state}
                onChange={(e) => {
                  setFormData({ ...formData, state: e.target.value, district: '' });
                  fetchDistricts(e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">Select State</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">District *</label>
              <select
                required
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">Select District</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sub-Division / Taluk</label>
              <input
                type="text"
                placeholder="e.g. Haveli Taluk"
                value={formData.sub_division_taluk}
                onChange={(e) => setFormData({ ...formData, sub_division_taluk: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Village *</label>
              <input
                type="text"
                required
                placeholder="e.g. Khed Shivapur"
                value={formData.village}
                onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Land Classification</label>
              <select
                value={formData.land_type}
                onChange={(e) => setFormData({ ...formData, land_type: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="Agricultural">Agricultural Land</option>
                <option value="Commercial">Commercial Land</option>
                <option value="Residential">Residential Land</option>
                <option value="Industrial">Industrial Zone</option>
                <option value="Barren">Barren / Waste Land</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Land Area (in Acres) *</label>
              <input
                type="number"
                step="0.001"
                required
                placeholder="e.g. 4.250"
                value={formData.area_acres}
                onChange={(e) => setFormData({ ...formData, area_acres: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Circle Rate / Market Value (₹/Acre) *</label>
              <input
                type="number"
                required
                placeholder="e.g. 2800000"
                value={formData.market_value_per_acre}
                onChange={(e) => setFormData({ ...formData, market_value_per_acre: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Latitude (GPS) *</label>
              <input
                type="number"
                step="0.000001"
                required
                placeholder="e.g. 18.354120"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Longitude (GPS) *</label>
              <input
                type="number"
                step="0.000001"
                required
                placeholder="e.g. 73.854210"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

          </div>

          <div className="pt-3 border-t border-slate-100">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">Primary Landowner Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Owner Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full legal owner name"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91-9822012345"
                  value={formData.owner_contact}
                  onChange={(e) => setFormData({ ...formData, owner_contact: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Owner Aadhaar / UID</label>
                <input
                  type="text"
                  placeholder="xxxx-xxxx-xxxx"
                  value={formData.owner_aadhaar}
                  onChange={(e) => setFormData({ ...formData, owner_aadhaar: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
                />
              </div>
            </div>
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
              {processing ? 'Registering...' : 'Save & Register Parcel'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: View Details */}
      {activeParcel && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={`Cadastral Survey #${activeParcel.survey_number} Details`}
          subtitle={`${activeParcel.village}, ${activeParcel.district_name}, ${activeParcel.state_name}`}
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block font-semibold">Owner Name</span>
                <span className="font-bold text-slate-900 text-sm">{activeParcel.owner_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Aadhaar / UID</span>
                <span className="font-mono text-slate-800">{activeParcel.owner_aadhaar || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Contact Phone</span>
                <span className="text-slate-800">{activeParcel.owner_contact || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Total Area</span>
                <span className="font-bold text-slate-800">{activeParcel.area_acres} Acres ({activeParcel.area_sq_meters} m²)</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Land Type</span>
                <span className="text-slate-800">{activeParcel.land_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Configured Circle Rate</span>
                <span className="font-semibold text-slate-900">₹{Number(activeParcel.market_value_per_acre).toLocaleString('en-IN')}/acre</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">GPS Coordinates</span>
                <span className="font-mono text-slate-800">{activeParcel.latitude}, {activeParcel.longitude}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Title Verification</span>
                <StatusBadge status={activeParcel.verification_status} />
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Acquisition Status</span>
                <StatusBadge status={activeParcel.acquisition_status} />
              </div>
            </div>

            {activeParcel.verification_remarks && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                <span className="font-bold block mb-0.5">Verification Remarks:</span>
                {activeParcel.verification_remarks}
                {activeParcel.verified_by_name && (
                  <span className="block text-[10px] text-amber-700 mt-1">
                    Verified by: {activeParcel.verified_by_name} ({new Date(activeParcel.verified_at).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}

            {/* Documents List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Uploaded Verification Documents ({activeParcel.documents?.length || 0})
                </h4>
                <button
                  onClick={() => { setShowDetailModal(false); setShowUploadModal(true); }}
                  className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Upload Document
                </button>
              </div>

              {!activeParcel.documents || activeParcel.documents.length === 0 ? (
                <div className="p-4 text-center bg-slate-50 border border-slate-200 rounded-lg text-slate-400">
                  No documents uploaded for this parcel yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {activeParcel.documents.map((doc) => (
                    <div key={doc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-bold text-slate-900">{doc.title}</div>
                          <div className="text-[10px] text-slate-400">{doc.document_type_display}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={doc.verification_status} />
                        <a
                          href={doc.document_file}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs bg-white border border-slate-300 rounded hover:bg-slate-100 transition font-medium"
                        >
                          View File
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Verify Record */}
      {activeParcel && (
        <Modal
          isOpen={showVerifyModal}
          onClose={() => setShowVerifyModal(false)}
          title={`Administrative Title Verification: Survey #${activeParcel.survey_number}`}
          subtitle={`Owner: ${activeParcel.owner_name} | Location: ${activeParcel.village}, ${activeParcel.district_name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleVerifySubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Decision Status *</label>
              <select
                value={verifyStatus}
                onChange={(e) => setVerifyStatus(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="Verified">Approve & Verify (Clear Title)</option>
                <option value="Rejected">Reject (Title Dispute / Discrepancy)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Administrative Remarks / Ground Note *</label>
              <textarea
                required
                rows={3}
                placeholder="Enter revenue verification remarks, Tehsil inquiry notes, or reasons for rejection..."
                value={verifyRemarks}
                onChange={(e) => setVerifyRemarks(e.target.value)}
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
                {processing ? 'Saving...' : 'Submit Verification'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Upload Document */}
      {activeParcel && (
        <Modal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          title={`Upload Title Document: Survey #${activeParcel.survey_number}`}
          subtitle={`Owner: ${activeParcel.owner_name} (${activeParcel.village})`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Form 7/12 Extract or Sale Deed"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Document Category *</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="ownership_certificate">Ownership Certificate / 7/12 Extract / Patta</option>
                <option value="land_survey_document">Cadastral Survey Map / Land Map</option>
                <option value="identity_document">Owner Identity Proof (Aadhaar / Voter ID)</option>
                <option value="supporting_document">Supporting Acquisition / NoC Document</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select File (PDF, PNG, JPG) *</label>
              <input
                type="file"
                required
                onChange={(e) => setDocFile(e.target.files[0])}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-gov-navy hover:file:bg-slate-200"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={processing}
                className="px-4 py-2 bg-gov-navy text-white rounded-lg hover:bg-slate-800 transition font-medium"
              >
                {processing ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};

export default LandRecords;
