import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Bell, LogOut, ShieldCheck, UserCheck, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Navbar = () => {
  const { user, logout, quickSwitchDemoRole, notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAuth();
  const { addToast } = useToast();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const handleRoleSwitch = async (username, roleLabel) => {
    try {
      await quickSwitchDemoRole(username);
      setShowRoleMenu(false);
      addToast(`Switched active session to ${roleLabel} (${username})`, 'success');
    } catch (e) {
      addToast('Error switching demonstration account', 'error');
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast('Logged out successfully', 'info');
  };

  return (
    <header className="sticky top-0 z-40 bg-gov-navy text-white shadow-md border-b border-slate-700">
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5">
        
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-white/10 p-1.5 border border-white/20">
            {/* Ashoka Pillar Lion Capital Emblem Representation */}
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-gov-gold fill-current" aria-label="National Emblem">
              <path d="M12 2L4 7v6c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V7l-8-5zm0 2.2l6 3.75v5.05c0 4.4-3 8.6-6 9.8-3-1.2-6-5.4-6-9.8V7.95l6-3.75z"/>
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-widest text-slate-300 font-semibold">Government of India</span>
              <span className="text-[10px] bg-gov-teal/30 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/30 font-mono">PORTAL 2.0</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
              National Land Acquisition & Management System
            </h1>
          </div>
        </div>

        {/* Right Action Tools: Role Switcher, Notifications, User Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          {/* Quick Demo Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowRoleMenu(!showRoleMenu); setShowNotifs(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-slate-200 transition"
              title="Fast switch demonstration roles"
            >
              <UserCheck className="w-3.5 h-3.5 text-gov-gold" />
              <span className="hidden md:inline">Demo Role:</span>
              <span className="font-semibold text-white truncate max-w-[120px]">{user?.role_display || user?.username}</span>
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-slate-800 animate-fade-in text-xs">
                <div className="px-3 py-1.5 border-b border-slate-100 font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Switch Demo Account
                </div>
                <button
                  onClick={() => handleRoleSwitch('admin', 'National Admin')}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${user?.username === 'admin' ? 'bg-blue-50 font-bold text-blue-900' : ''}`}
                >
                  <div>
                    <div className="font-semibold">National Administrator</div>
                    <div className="text-[11px] text-slate-500">Full central clearance rights</div>
                  </div>
                  {user?.username === 'admin' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('state_officer', 'State Officer')}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${user?.username === 'state_officer' ? 'bg-blue-50 font-bold text-blue-900' : ''}`}
                >
                  <div>
                    <div className="font-semibold">State Officer (MH)</div>
                    <div className="text-[11px] text-slate-500">Principal Secretary Revenue</div>
                  </div>
                  {user?.username === 'state_officer' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('district_officer', 'District Officer')}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${user?.username === 'district_officer' ? 'bg-blue-50 font-bold text-blue-900' : ''}`}
                >
                  <div>
                    <div className="font-semibold">District Officer (Pune)</div>
                    <div className="text-[11px] text-slate-500">District Collector / DM</div>
                  </div>
                  {user?.username === 'district_officer' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('dept_officer', 'Department Officer')}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${user?.username === 'dept_officer' ? 'bg-blue-50 font-bold text-blue-900' : ''}`}
                >
                  <div>
                    <div className="font-semibold">Department Officer (NHAI)</div>
                    <div className="text-[11px] text-slate-500">Special Land Acquisition Officer</div>
                  </div>
                  {user?.username === 'dept_officer' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                </button>
                <button
                  onClick={() => handleRoleSwitch('landowner', 'Landowner')}
                  className={`w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between ${user?.username === 'landowner' ? 'bg-blue-50 font-bold text-blue-900' : ''}`}
                >
                  <div>
                    <div className="font-semibold">Landowner (Ramesh Patil)</div>
                    <div className="text-[11px] text-slate-500">Citizen & Farmer Portal</div>
                  </div>
                  {user?.username === 'landowner' && <ShieldCheck className="w-4 h-4 text-blue-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowRoleMenu(false); }}
              className="relative p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-gov-navy">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-fade-in">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                  <div className="font-bold text-sm text-slate-800">Alerts & Notifications</div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">No notifications</div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationRead(n.id)}
                        className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                      >
                        <div className="flex items-center justify-between font-semibold text-slate-900 mb-0.5">
                          <span>{n.title}</span>
                          {!n.is_read && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                        </div>
                        <p className="text-slate-600 leading-snug">{n.message}</p>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.created_at).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User profile / Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/20">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-bold text-white">{user?.first_name} {user?.last_name || user?.username}</div>
              <div className="text-[10px] text-slate-300 font-mono">{user?.designation || user?.role_display}</div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-slate-300 hover:text-rose-300 hover:bg-white/10 transition"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Navbar;
