import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArcLoader } from '../common/ArcLoader';

export interface RoleGuardProps {
  allowedRoles: string[];
  allowAdminFlag?: boolean;
  unauthenticatedRedirect?: string;
  unauthorizedRedirect?: string;
  loadingTitle?: string;
  children: React.ReactNode;
}

const STAFF_PORTAL_ROLES = new Set([
  'dept_staff',
  'admin',
  'department_head',
  'dept_head',
  'supervisor',
  'control_room',
  'management_viewer',
  'field_employee',
  'municipal_administrator',
  'municipal_commissioner',
  'commissioner',
  'deputy_commissioner',
  'area_officer',
  'operational_staff',
  'verification_officer',
  'verifier',
  'appeals_officer',
  'platform_owner',
  'super_admin',
]);

export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  allowAdminFlag = true,
  unauthenticatedRedirect = '/dept/login',
  unauthorizedRedirect,
  loadingTitle = 'Verifying access…',
  children,
}) => {
  const { user, profile, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  const { userRoleTokens, isAuthorized, fallbackRedirect } = useMemo(() => {
    const rawTokens = [
      profile?.role,
      profile?.authority_role,
      profile?.hierarchy_code,
      (user?.user_metadata as Record<string, unknown> | undefined)?.role as string | undefined,
    ];

    const tokens = Array.from(
      new Set(
        rawTokens
          .map((value) => (value || '').toLowerCase().trim())
          .filter(Boolean)
      )
    );

    const allowedSet = new Set(
      allowedRoles.map((r) => r.toLowerCase().trim()).filter(Boolean)
    );

    const hasAllowedRole = tokens.some((token) => allowedSet.has(token));
    const hasAdminAccess = Boolean(
      allowAdminFlag && (isAdmin || profile?.is_admin === true)
    );

    const authorized = Boolean(user && (hasAdminAccess || hasAllowedRole));
    const hasStaffPortalRole = tokens.some((token) => STAFF_PORTAL_ROLES.has(token));
    const redirectTarget =
      unauthorizedRedirect || (hasStaffPortalRole ? '/dept/dashboard' : '/');

    return {
      userRoleTokens: tokens,
      isAuthorized: authorized,
      fallbackRedirect: redirectTarget,
    };
  }, [user, profile, isAdmin, allowedRoles, allowAdminFlag, unauthorizedRedirect]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(unauthenticatedRedirect, { replace: true });
      return;
    }
    if (!isAuthorized) {
      navigate(fallbackRedirect, { replace: true });
    }
  }, [loading, user, isAuthorized, unauthenticatedRedirect, fallbackRedirect, navigate, userRoleTokens]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf9f6',
          padding: 20,
        }}
      >
        <ArcLoader
          mode="inline"
          status={loadingTitle}
          subtitle="Verifying role permissions & authenticating session…"
          theme="portal"
        />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return null;
  }

  return <>{children}</>;
};

export default RoleGuard;
