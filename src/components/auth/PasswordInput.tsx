import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {}

export const PasswordInput: React.FC<Props> = ({ className = '', ...rest }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mb-3">
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <Lock size={16} />
      </div>
      <input
        {...rest}
        type={show ? 'text' : 'password'}
        className={`w-full bg-sand-50 border border-sand-200 rounded-2xl py-3 pl-10 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:border-civic-500 focus:ring-4 focus:ring-civic-500/10 focus:outline-none transition ${className}`}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-1"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
};
