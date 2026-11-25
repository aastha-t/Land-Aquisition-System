import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import {
  Users, Plus, Search, Filter, ShieldCheck,
  UserCheck, History, Mail, Phone, Building
} from 'lucide-react';

export const UserManagement = () => {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [usersList, setUsersList] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users' or 'audit'

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [form, setForm] = useState({
    username: '',
    password: 'password123',
    first_name: '',
    last_name: '',
    email: '',
    role: 'district_officer',
    department: '',
    designation: '',
    phone_number: '',
    state: '',
    district: '',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = [];
      if (search) query.push(`search=${encodeURIComponent(search)}`);
      if (roleFilter) query.push(`role=${roleFilter}`);
      const qs = query.length ? `?${query.join('&')}` : '';

      const res = await api.get(`/accounts/users/${qs}`);
      setUsersList(res.data.results || res.data || []);
    } catch (err) {
      addToast('Error fetching user accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/accounts/activity-logs/');
      setActivityLogs(res.data.results || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [sRes, dRes] = await Promise.all([
        api.get('/land/states/'),
        api.get('/land/districts/'),
      ]);
      setStates(sRes.data);
      setDistricts(dRes.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/accounts/users/', form);
      addToast(`Account for ${form.username} created successfully!`, 'success');
      setShowCreateModal(false);
      setForm({
        username: '',
        password: 'password123',
        first_name: '',
        last_name: '',
        email: '',
        role: 'district_officer',
        department: '',
        designation: '',
        phone_number: '',
        state: '',
        district: '',
      });
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Failed to create user';
      addToast(msg, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const canManageUsers = ['national_admin', 'state_officer'].includes(user?.role);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            User Administration & Audit Trails
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Role-based access control (RBAC), officer jurisdiction assignments & complete system activity audit log
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-gov-navy hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Officer Account</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold space-x-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'users'
              ? 'border-gov-navy text-gov-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active User Directory ({usersList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 flex items-center gap-2 border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-gov-navy text-gov-navy'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Security & Activity Audit Log ({activityLogs.length})</span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search username, name, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-2 px-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">All Roles</option>
                <option value="national_admin">National Administrator</option>
                <option value="state_officer">State Officer</option>
                <option value="district_officer">District Officer</option>
                <option value="department_officer">Department Officer</option>
                <option value="landowner">Landowner</option>
              </select>
            </div>

            <div className="text-slate-500 font-medium">
              Registered Accounts: <span className="font-bold text-slate-800">{usersList.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <LoadingSpinner label="Loading user directory..." />
            ) : usersList.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role Classification</th>
                      <th className="py-3 px-4">Department & Designation</th>
                      <th className="py-3 px-4">Jurisdiction</th>
                      <th className="py-3 px-4">Contact Info</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{u.first_name} {u.last_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">@{u.username}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            u.role === 'national_admin' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            u.role === 'state_officer' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            u.role === 'district_officer' ? 'bg-teal-50 text-teal-800 border-teal-200' :
                            u.role === 'department_officer' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                            'bg-slate-50 text-slate-800 border-slate-200'
                          }`}>
                            {u.role_display}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{u.designation || 'Citizen User'}</div>
                          <div className="text-[10px] text-slate-400">{u.department || 'Revenue Landowner'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-800">{u.district_name || u.state_name || 'National Level'}</div>
                          {u.district_name && <div className="text-[10px] text-slate-400">{u.state_name}</div>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          <div>{u.email}</div>
                          <div className="text-[10px] text-slate-400">{u.phone_number}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Audit Log Tab */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">Security & Operational Activity Audit</h3>
            <p className="text-xs text-slate-500">Immutable ledger of administrative logins, approvals, title verifications & DBT transactions</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-700 uppercase font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Officer / User</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Network IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {activityLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition font-sans">
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-gov-navy">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.username || 'System'}</div>
                      <div className="text-[10px] text-slate-400">{log.user_role}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[10px]">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Provision Officer Account */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Provision New Government Officer Account"
        subtitle="Create credentials and assign administrative role and jurisdiction"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Username *</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Temporary Password *</label>
              <input
                type="text"
                required
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Role Classification *</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
            >
              <option value="national_admin">National Administrator</option>
              <option value="state_officer">State Officer</option>
              <option value="district_officer">District Officer</option>
              <option value="department_officer">Department Officer</option>
              <option value="landowner">Landowner</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State Jurisdiction</label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">National / None</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">District Jurisdiction</label>
              <select
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy bg-white"
              >
                <option value="">State-Wide / None</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                placeholder="officer@nic.in"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-1 focus:ring-gov-navy"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Phone</label>
              <input
                type="text"
                placeholder="+91-9876543210"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
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
              {processing ? 'Provisioning...' : 'Provision User'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default UserManagement;
