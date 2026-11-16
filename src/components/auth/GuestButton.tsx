import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { t } from '../../lib/i18n';

interface Props {
  language: 'en' | 'hi';
}

export const GuestButton: React.FC<Props> = ({ language }) => {
  const navigate = useNavigate();

  return (
    <div className="mt-5 text-center">
      <div className="text-xs text-slate-400 font-medium">
        {t(language, 'orContinueAs')}
      </div>
      <button
        type="button"
        onClick={() => navigate('/')}
        className="w-full mt-2.5 py-3 rounded-2xl bg-sand-50 hover:bg-civic-50 text-civic-900 border border-sand-200 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition active:scale-[0.99] cursor-pointer"
      >
        <User size={16} className="text-civic-700" />
        <span>{t(language, 'guestMode')}</span>
      </button>
    </div>
  );
};
