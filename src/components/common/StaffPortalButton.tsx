import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  ClipboardCheck,
  PhoneCall,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getStaffPortalNavMeta,
  mergeUserRoleProfile,
  type PortalKind,
} from '../../lib/roleDefinitions';

export function getPortalIcon(kind: PortalKind, className = 'w-4 h-4') {
  switch (kind) {
    case 'admin':
      return <ShieldCheck className={className} />;
    case 'municipal':
      return <Building2 className={className} />;
    case 'control_room':
      return <PhoneCall className={className} />;
    case 'verifier':
      return <ClipboardCheck className={className} />;
    case 'dept':
    default:
      return <Briefcase className={className} />;
  }
}

interface StaffPortalNavButtonProps {
  /** Compact icon+short-label pill suited for top headers across desktop and mobile. */
  variant?: 'header-pill' | 'desktop-nav';
}

/**
 * Renders a role-aware navigation link sending Admin, Municipal, Control Room,
 * Verifier, and Department users directly to their dedicated workspace.
 */
export const StaffPortalNavButton: React.FC<StaffPortalNavButtonProps> = ({
  variant = 'header-pill',
}) => {
  const { user, profile, isAdmin, language } = useAuth();
  const location = useLocation();
  const hi = language === 'hi';

  const effectiveProfile = mergeUserRoleProfile(profile, user);
  const meta = user
    ? isAdmin
      ? getStaffPortalNavMeta({ role: 'admin', is_admin: true }, user.email)
      : getStaffPortalNavMeta(effectiveProfile, user.email)
    : null;

  if (!meta || meta.kind === 'citizen') {
    if (variant === 'desktop-nav') {
      return (
        <Link
          to="/dept/login"
          className="px-4 py-1.5 rounded-full text-sm font-medium text-civic-700 hover:text-civic-900 hover:bg-civic-50 transition text-decoration-none flex items-center gap-1"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{hi ? 'विभाग पोर्टल' : 'Dept Portal'}</span>
        </Link>
      );
    }
    return null;
  }

  const isOnPortal = location.pathname.startsWith(meta.route);
  const fullLabel = hi ? meta.labelHi : meta.labelEn;
  const shortLabel = hi ? meta.shortLabelHi : meta.shortLabelEn;

  if (variant === 'desktop-nav') {
    return (
      <Link
        to={meta.route}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition text-decoration-none flex items-center gap-1.5 ${
          isOnPortal
            ? 'bg-civic-700 text-white shadow-2xs'
            : 'text-civic-800 bg-civic-50 hover:bg-civic-100 border border-civic-200/80'
        }`}
      >
        {getPortalIcon(meta.kind, 'w-3.5 h-3.5')}
        <span>{fullLabel}</span>
      </Link>
    );
  }

  if (isOnPortal) return null;

  const badgeTone =
    meta.kind === 'admin'
      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
      : 'bg-civic-50 text-civic-800 border-civic-200 hover:bg-civic-100';

  return (
    <Link
      to={meta.route}
      title={fullLabel}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-extrabold shadow-2xs transition active:scale-95 text-decoration-none shrink-0 ${badgeTone}`}
    >
      {getPortalIcon(meta.kind, 'w-3.5 h-3.5 shrink-0')}
      <span className="sm:hidden">{shortLabel}</span>
      <span className="hidden sm:inline">{fullLabel}</span>
    </Link>
  );
};
