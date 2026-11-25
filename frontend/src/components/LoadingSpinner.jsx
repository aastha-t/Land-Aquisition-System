import React from 'react';

export const LoadingSpinner = ({ label = "Loading land acquisition data..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <div className="w-10 h-10 border-4 border-gov-100 border-t-gov-navy rounded-full animate-spin mb-3"></div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
};

export default LoadingSpinner;
