import React from 'react';
import { CivicHeader } from '../common/CivicHeader';

interface Props {
  language: 'en' | 'hi';
  onLanguageChange: (l: 'en' | 'hi') => void;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<Props> = ({
  language,
  children,
}) => (
  <div className="min-h-screen bg-sand-50 text-civic-950 font-sans pb-16">
    <CivicHeader
      title={language === 'hi' ? 'नागरिक खाता' : 'Citizen Account'}
      subtitle={language === 'hi' ? 'नगर पालिका परिषद बैतूल • स्मार्ट नागरिक पोर्टल' : 'Nagar Palika Parishad Betul • Smart Citizen Portal'}
      showBack
    />
    <div className="max-w-md mx-auto px-4 pt-8 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-civic-50 border border-civic-100 text-civic-800 text-xs font-semibold mb-3">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>{language === 'hi' ? 'सुरक्षित नागरिक लॉगिन' : 'Verified Citizen Access'}</span>
      </div>
      <h1 className="text-2xl font-extrabold text-civic-950 tracking-tight">
        {language === 'hi' ? 'बैतूल 311 पोर्टल' : 'Betul 311 Portal'}
      </h1>
      <p className="text-xs text-slate-500 mt-1">
        {language === 'hi'
          ? 'नागरिक शिकायतें दर्ज करें व रियल-टाइम स्थिति ट्रैक करें'
          : 'Report civic issues & track municipal resolution in real time'}
      </p>
    </div>
    {children}
  </div>
);
