import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  FolderKanban, Plus, Search, Filter, Calendar, Users,
  MapPin, AlertTriangle, CheckCircle, ArrowRight, Trash2, Link as LinkIcon
} from 'lucide-react';

export const AcquisitionProjects = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [projects, setProjects] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [availableParcels, setAvailableParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [delayedOnly, setDelayedOnly] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showManageParcelsModal, setShowManageParcelsModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  const [activeProject, setActiveProject] = useState(null);
  const [projectParcels, setProjectParcels] = useState([]);
  const [processing, setProcessing] = useState(false);

  // Parcel linking form
  const [selectedParcelId, setSelectedParcelId] = useState('');
  const [parcelLinkStatus, setParcelLinkStatus] = useState('Identified');
  const [parcelCompensation, setParcelCompensation] = useState('0');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    project_code: '',
    category: 'Highway',
    description: '',
    state: '',
    district: '',
    executing_agency: '',
    assigned_officer: '',
    status: 'Planning',
    target_land_area_acres: '100',
    estimated_budget: '50000000',
    expected_completion_date: '',
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

  const fetchOfficers = async () => {
    try {
      const res = await api.get('/accounts/users/');
      const usersList = res.data.results || res.data || [];
      setOfficers(usersList.filter(u => u.role !== 'landowner'));
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      let query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (categoryFilter) query.push(`category=${categoryFilter}`);
      if (statusFilter) query.push(`status=${statusFilter}`);
      if (delayedOnly) query.push(`delayed=true`);

      const qs = query.length ? `?${query.join('&')}` : '';
      const res = await api.get(`/projects/${qs}`);
      setProjects(res.data.results || res.data || []);
    } catch (err) {
      addToast('Error fetching acquisition projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectParcels = async (projectId) => {
    try {
      const res = await api.get(`/projects/${projectId}/parcels/`);
      setProjectParcels(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAllParcels = async () => {
    try {
      const res = await api.get('/land/parcels/');
      setAvailableParcels(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStates();
    fetchDistricts();
    fetchOfficers();
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [search, categoryFilter, statusFilter, delayedOnly]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/projects/', formData);
      addToast(`Project '${formData.name}' created successfully!`, 'success');
      setShowCreateModal(false);
      fetchProjects();
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create project';
      addToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleOpenManageParcels = (proj) => {
    setActiveProject(proj);
    fetchProjectParcels(proj.id);
    fetchAllParcels();
    setSelectedParcelId('');
    setShowManageParcelsModal(true);
  };

  const handleLinkParcel = async (e) => {
    e.preventDefault();
    if (!selectedParcelId || !activeProject) return;
    setProcessing(true);
    try {
      await api.post(`/projects/${activeProject.id}/parcels/`, {
        land_parcel_id: selectedParcelId,
        status: parcelLinkStatus,
        compensation_amount: parcelCompensation,
      });
      addToast('Land parcel successfully associated with project!', 'success');
      fetchProjectParcels(activeProject.id);
      fetchProjects();
      setSelectedParcelId('');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to link parcel', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveParcel = async (parcelId) => {
    if (!activeProject) return;
    try {
      await api.delete(`/projects/${activeProject.id}/parcels/${parcelId}/`);
      addToast('Parcel association removed', 'info');
      fetchProjectParcels(activeProject.id);
      fetchProjects();
    } catch (err) {
      addToast('Failed to remove parcel link', 'error');
    }
  };

  const isLandowner = user?.role === 'landowner';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            National Infrastructure Acquisition Projects
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            End-to-end corridor acquisition, statutory progress tracking & multi-district parcel linkage
          </p>
        </div>
        {!isLandowner && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Acquisition Project</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search project name, code, agency..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
            >
              <option value="">Infrastructure Category: All</option>
              <option value="Highway">Highway</option>
              <option value="Railway">Railway</option>
              <option value="Airport">Airport</option>
              <option value="Industrial Development">Industrial Development</option>
              <option value="Other Infrastructure">Other Infrastructure</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
            >
              <option value="">Status: All Stages</option>
              <option value="Planning">Planning</option>
              <option value="Land_Identification">Land Identification</option>
              <option value="Document_Verification">Document Verification</option>
              <option value="Compensation_Assessment">Compensation Assessment</option>
              <option value="In_Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Delayed">Delayed</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={delayedOnly}
                onChange={(e) => setDelayedOnly(e.target.checked)}
                className="w-4 h-4 text-gov-navy rounded border-slate-300 focus:ring-gov-navy"
              />
              <span className="flex items-center gap-1 text-rose-700">
                <AlertTriangle className="w-3.5 h-3.5" /> Show Delayed Projects Only
              </span>
            </label>
          </div>

        </div>
      </div>

      {/* Projects Table / Card Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner label="Loading infrastructure projects..." />
        ) : projects.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No acquisition projects matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Code & Project</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">State & District</th>
                  <th className="py-3.5 px-4">Executing Agency</th>
                  <th className="py-3.5 px-4">Parcels & Acres</th>
                  <th className="py-3.5 px-4">Completion Target</th>
                  <th className="py-3.5 px-4">Progress</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gov-navy font-mono text-[11px]">{proj.project_code}</div>
                      <div className="font-semibold text-slate-900 line-clamp-1 max-w-xs">{proj.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {proj.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{proj.district_name || 'Multi-District'}</div>
                      <div className="text-[10px] text-slate-400">{proj.state_name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-[140px]">
                      {proj.executing_agency}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div><span className="font-bold text-slate-900">{proj.total_parcels_count}</span> parcels</div>
                      <div className="text-[10px] text-slate-400">{proj.associated_acres} / {proj.target_land_area_acres} ac</div>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <div className={proj.is_delayed ? 'text-rose-600 font-bold flex items-center gap-1' : 'text-slate-700'}>
                        {proj.is_delayed && <AlertTriangle className="w-3.5 h-3.5" />}
                        {proj.expected_completion_date}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-24">
                        <div className="flex justify-between text-[10px] font-bold text-slate-700 mb-1">
                          <span>{proj.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              proj.progress_percentage === 100 ? 'bg-emerald-500' : proj.is_delayed ? 'bg-amber-500' : 'bg-gov-teal'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, proj.progress_percentage))}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={proj.status} />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 whitespace-nowrap">
                      {!isLandowner && (
                        <button
                          onClick={() => handleOpenManageParcels(proj)}
                          className="px-2.5 py-1 text-xs font-semibold text-gov-navy bg-slate-100 hover:bg-slate-200 rounded-md transition inline-flex items-center gap-1"
                          title="Manage Associated Land Parcels"
                        >
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>Parcels ({proj.total_parcels_count})</span>
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

      {/* Modal: Create Project */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New National Land Acquisition Project"
        subtitle="Define infrastructure parameters, executing agency, target acreage and completion target"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. NH-48 Pune-Satara Expressway Expansion"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Project Code / Reference *</label>
              <input
                type="text"
                required
                placeholder="e.g. NHAI-MH-2026-05"
                value={formData.project_code}
                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Infrastructure Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="Highway">Highway Expansion</option>
                <option value="Railway">Dedicated Freight & High Speed Rail</option>
                <option value="Airport">Greenfield / Brownfield Airport</option>
                <option value="Industrial Development">Industrial Corridor & SEZ</option>
                <option value="Other Infrastructure">Other Infrastructure (Port, Dam, Power)</option>
              </select>
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
              <label className="block font-semibold text-slate-700 mb-1">Primary District</label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">Multi-District / State-Wide</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Executing Agency *</label>
              <input
                type="text"
                required
                placeholder="e.g. NHAI, DFCCIL, CIDCO, AAI"
                value={formData.executing_agency}
                onChange={(e) => setFormData({ ...formData, executing_agency: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Assigned Land Acquisition Officer</label>
              <select
                value={formData.assigned_officer}
                onChange={(e) => setFormData({ ...formData, assigned_officer: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">Assign Officer</option>
                {officers.map((o) => (
                  <option key={o.id} value={o.id}>{o.first_name} {o.last_name || o.username} ({o.role_display})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target Land Area (Acres) *</label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.target_land_area_acres}
                onChange={(e) => setFormData({ ...formData, target_land_area_acres: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estimated Budget (INR ₹) *</label>
              <input
                type="number"
                required
                value={formData.estimated_budget}
                onChange={(e) => setFormData({ ...formData, estimated_budget: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Scheduled Target Completion *</label>
              <input
                type="date"
                required
                value={formData.expected_completion_date}
                onChange={(e) => setFormData({ ...formData, expected_completion_date: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="Planning">Planning & Survey</option>
                <option value="Land_Identification">Land Identification (Sec 4)</option>
                <option value="Document_Verification">Document Verification</option>
                <option value="Compensation_Assessment">Compensation Assessment</option>
                <option value="In_Progress">In Progress</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Project Corridor Description</label>
              <textarea
                rows={2}
                placeholder="Corridor alignment details, gazette notification details, chainage..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
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
              {processing ? 'Creating...' : 'Save & Initialize Project'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Manage Associated Land Parcels */}
      {activeProject && (
        <Modal
          isOpen={showManageParcelsModal}
          onClose={() => setShowManageParcelsModal(false)}
          title={`Link Land Parcels: ${activeProject.name}`}
          subtitle={`Project Code: ${activeProject.project_code} | Target: ${activeProject.target_land_area_acres} Acres`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs">
            
            {/* Form to attach a new parcel */}
            <form onSubmit={handleLinkParcel} className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Attach Registered Land Parcel to this Project
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Land Parcel *</label>
                  <select
                    required
                    value={selectedParcelId}
                    onChange={(e) => setSelectedParcelId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
                  >
                    <option value="">-- Choose Parcel --</option>
                    {availableParcels.map((p) => (
                      <option key={p.id} value={p.id}>
                        Survey #{p.survey_number} - {p.village} ({p.owner_name}, {p.area_acres} ac)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Acquisition Stage</label>
                  <select
                    value={parcelLinkStatus}
                    onChange={(e) => setParcelLinkStatus(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
                  >
                    <option value="Identified">Identified (Sec 4 Gazette)</option>
                    <option value="Surveyed">Joint Survey Completed</option>
                    <option value="Approved_For_Acquisition">Acquisition Sanctioned</option>
                    <option value="Compensation_Determined">Award Announced (Sec 30)</option>
                    <option value="Acquired">Physical Possession Taken</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Estimated Compensation (₹)</label>
                  <input
                    type="number"
                    value={parcelCompensation}
                    onChange={(e) => setParcelCompensation(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
                  />
                </div>

              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-gov-navy text-white rounded-lg hover:bg-slate-800 transition font-medium flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{processing ? 'Linking...' : 'Attach Parcel to Project'}</span>
                </button>
              </div>
            </form>

            {/* List of currently associated parcels */}
            <div>
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                Currently Associated Land Parcels ({projectParcels.length})
              </div>

              {projectParcels.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-white border border-slate-200 rounded-lg">
                  No parcels linked to this project yet. Use the form above to add parcels.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">Survey #</th>
                        <th className="py-2.5 px-3">Owner & Location</th>
                        <th className="py-2.5 px-3">Area</th>
                        <th className="py-2.5 px-3">Award Sanctioned</th>
                        <th className="py-2.5 px-3">Corridor Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {projectParcels.map((link) => (
                        <tr key={link.id} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-bold font-mono text-gov-navy">
                            {link.survey_number}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{link.owner_name}</div>
                            <div className="text-[10px] text-slate-400">{link.village}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono">{link.area_acres} Acres</td>
                          <td className="py-2.5 px-3 font-mono">
                            ₹{Number(link.compensation_amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3">
                            <StatusBadge status={link.status} />
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRemoveParcel(link.land_parcel)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Unlink Parcel"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowManageParcelsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition"
              >
                Done
              </button>
            </div>

          </div>
        </Modal>
      )}

    </div>
  );
};

export default AcquisitionProjects;
