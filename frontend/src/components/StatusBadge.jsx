import React from 'react';

export const StatusBadge = ({ status }) => {
  if (!status) return null;

  const normalized = String(status).toLowerCase().replace(/[\s_-]+/g, '');

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';

  if (['verified', 'approved', 'finalapproved', 'disbursed', 'completed', 'resolved'].includes(normalized)) {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  } else if (['pending', 'underreview', 'inprogress', 'actiontaken', 'landidentification', 'planning'].includes(normalized)) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (['inacquisition', 'identified', 'surveyed', 'compensationassessment', 'compensationdetermined'].includes(normalized)) {
    colorClasses = 'bg-blue-50 text-blue-800 border-blue-300';
  } else if (['rejected', 'delayed', 'disputed', 'closed', 'onhold'].includes(normalized)) {
    colorClasses = 'bg-rose-50 text-rose-800 border-rose-300';
  } else if (['available', 'draft'].includes(normalized)) {
    colorClasses = 'bg-slate-100 text-slate-800 border-slate-300';
  }

  // Display label formatting
  const displayLabel = status.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
