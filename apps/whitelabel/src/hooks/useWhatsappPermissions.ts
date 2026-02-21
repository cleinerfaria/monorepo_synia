import { useAccessProfile, useHasPermission } from '@/hooks/useAccessProfiles';
import { useAuthStore } from '@/stores/authStore';

export function useWhatsappPermissions() {
  const { appUser } = useAuthStore();
  const { data: profile } = useAccessProfile(appUser?.access_profile_id || undefined);

  const isProfileAdmin = profile?.is_admin || false;
  const isAdminRole = isProfileAdmin || profile?.code === 'admin';
  const isManagerRole = profile?.code === 'manager';

  const { hasPermission: hasViewMessages } = useHasPermission('whatsapp', 'view_messages');
  const { hasPermission: hasManageMessages } = useHasPermission('whatsapp', 'manage_messages');
  const { hasPermission: hasManageInstances } = useHasPermission('whatsapp', 'manage_instances');
  const { hasPermission: hasManageAspects } = useHasPermission('whatsapp', 'manage_aspects');
  const { hasPermission: hasManageEvaluations } = useHasPermission(
    'whatsapp',
    'manage_evaluations'
  );

  const canManageInstances = isAdminRole || isManagerRole || isProfileAdmin || hasManageInstances;
  const canManageMessages = isAdminRole || isManagerRole || isProfileAdmin || hasManageMessages;
  const canManageAspects = isAdminRole || isManagerRole || isProfileAdmin || hasManageAspects;
  const canManageEvaluations =
    isAdminRole || isManagerRole || isProfileAdmin || hasManageEvaluations;

  const canViewMessages =
    isAdminRole || isManagerRole || isProfileAdmin || hasViewMessages || !!appUser;

  return {
    canViewMessages,
    canManageMessages,
    canManageInstances,
    canManageAspects,
    canManageEvaluations,
    isAdminRole,
    isManagerRole,
    isProfileAdmin,
  };
}
