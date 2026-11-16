import React from 'react';
import { t } from '../../lib/i18n';

type Mode = 'login' | 'register';

interface Props {
  mode: Mode;
  onChange: (m: Mode) => void;
  language: 'en' | 'hi';
}

export const AuthTabs: React.FC<Props> = ({ mode, onChange, language }) => (
  <div className="flex border-b border-sand-200 bg-sand-50/60 p-1.5">
    {(['login', 'register'] as Mode[]).map((m) => (
      <button
        key={m}
        type="button"
        onClick={() => onChange(m)}
        className={`flex-1 py-3 text-center rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer ${
          mode === m
            ? 'bg-white text-civic-950 shadow-2xs'
            : 'text-slate-500 hover:text-civic-900'
        }`}
      >
        {m === 'login' ? t(language, 'login') : t(language, 'register')}
      </button>
    ))}
  </div>
);
