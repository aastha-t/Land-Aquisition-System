import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  MapPin,
  FolderKanban,
  Map as MapIcon,
  FileCheck2,
  Coins,
  GitPullRequest,
  MessageSquareWarning,
  BarChart3,
  FileText,
  Users,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  const isLandowner = user?.role === 'landowner';

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['all'] },
    { label: 'Land Records', path: '/land-records', icon: MapPin, roles: ['all'] },
    { label: 'Acquisition Projects', path: '/projects', icon: FolderKanban, roles: ['all'] },
    { label: 'Interactive GIS Map', path: '/gis-map', icon: MapIcon, roles: ['all'] },
    { label: 'Document Verification', path: '/document-verification', icon: FileCheck2, roles: ['officers', 'national_admin', 'state_officer', 'district_officer', 'department_officer'] },
    { label: 'Compensation', path: '/compensation', icon: Coins, roles: ['all'] },
    { label: 'Approvals Workflow', path: '/approvals', icon: GitPullRequest, roles: ['all'] },
    { label: 'Citizen Grievances', path: '/grievances', icon: MessageSquareWarning, roles: ['all'] },
    { label: 'Decision Analytics', path: '/analytics', icon: BarChart3, roles: ['officers', 'national_admin', 'state_officer', 'district_officer', 'department_officer'] },
    { label: 'Audit Reports (PDF)', path: '/reports', icon: FileText, roles: ['all'] },
    { label: 'User Directory', path: '/users', icon: Users, roles: ['national_admin', 'state_officer', 'district_officer'] },
  ];

  const filteredNav = navItems.filter((item) => {
    if (item.roles.includes('all')) return true;
    if (isLandowner) return false;
    return item.roles.includes('officers') || item.roles.includes(user?.role);
  });

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      
      {/* Role jurisdiction indicator banner */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/40">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Scope</div>
        <div className="text-xs font-semibold text-white mt-0.5 truncate">
          {user?.state_name ? `${user.state_name}` : 'National Jurisdiction'}
          {user?.district_name && ` • ${user.district_name}`}
        </div>
        <div className="text-[11px] text-gov-gold font-medium mt-0.5">
          {user?.role_display}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-gov-teal text-white shadow font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 bg-slate-950/30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-medium text-slate-400">Central Registry Online</span>
        </div>
        <div className="mt-1 text-[10px]">Secure RFCTLARR Act 2013 Engine</div>
      </div>

    </aside>
  );
};

export default Sidebar;
