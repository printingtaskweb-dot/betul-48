import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: LucideIcon;
}

export const FormInput: React.FC<Props> = ({ icon: Icon, className = '', ...rest }) => (
  <div className="relative mb-3">
    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      <Icon size={16} />
    </div>
    <input
      {...rest}
      className={`w-full bg-sand-50 border border-sand-200 rounded-2xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 focus:outline-none transition ${className}`}
    />
  </div>
);
