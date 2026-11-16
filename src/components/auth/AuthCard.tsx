import React from 'react';

interface Props {
  children: React.ReactNode;
}

export const AuthCard: React.FC<Props> = ({ children }) => (
  <div className="max-w-md mx-auto px-4 mt-6">
    <div className="bg-white rounded-3xl border border-sand-200 shadow-card overflow-hidden">
      {children}
    </div>
  </div>
);
