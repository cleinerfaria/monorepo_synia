import { useQuery } from '@tanstack/react-query';
import { getStorageUrl, supabase } from '@/lib/supabase';

const LEGACY_SYSTEM_ASSET_PATHS: Record<string, string> = {
  'login/logo_login_light.png': 'logo_light.png',
  'login/logo_login_dark.png': 'logo_dark.png',
  'login/logo_login_light_small.png': 'logo_light_small.png',
  'login/logo_login_dark_small.png': 'logo_dark_small.png',
};

function normalizeLegacyAssetReference(assetPathOrUrl: string) {
  let normalizedValue = assetPathOrUrl.trim();

  Object.entries(LEGACY_SYSTEM_ASSET_PATHS).forEach(([legacyPath, nextPath]) => {
    normalizedValue = normalizedValue.replace(
      new RegExp(`/storage/v1/object/public/system_assets/${legacyPath.replace(/\//g, '\\/')}$`, 'i'),
      `/storage/v1/object/public/system_assets/${nextPath}`
    );
  });

  const cleanPath = normalizedValue.replace(/^\/+/, '');
  if (cleanPath in LEGACY_SYSTEM_ASSET_PATHS) {
    return `system_assets/${LEGACY_SYSTEM_ASSET_PATHS[cleanPath]}`;
  }

  if (cleanPath.startsWith('system_assets/')) {
    const bucketPath = cleanPath.slice('system_assets/'.length);
    if (bucketPath in LEGACY_SYSTEM_ASSET_PATHS) {
      return `system_assets/${LEGACY_SYSTEM_ASSET_PATHS[bucketPath]}`;
    }
  }

  return normalizedValue;
}

function resolvePublicAssetUrl(assetPathOrUrl?: string | null) {
  if (!assetPathOrUrl) return null;

  const trimmedValue = normalizeLegacyAssetReference(assetPathOrUrl);
  if (!trimmedValue) return null;

  if (/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  const normalizedPath = trimmedValue.replace(/^\/+/, '');
  if (!normalizedPath.startsWith('system_assets/')) {
    return trimmedValue;
  }

  const [, ...assetSegments] = normalizedPath.split('/');
  if (!assetSegments.length) {
    return trimmedValue;
  }

  return getStorageUrl('system_assets', assetSegments.join('/'));
}

function normalizeSystemSettings(data: any) {
  if (!data) return null;

  const logoExpandedLight = resolvePublicAssetUrl(
    data.logo_url_expanded_light ?? data.logo_light ?? null
  );
  const logoExpandedDark = resolvePublicAssetUrl(data.logo_url_expanded_dark ?? data.logo_dark ?? null);
  const logoCollapsedLight = resolvePublicAssetUrl(
    data.logo_url_collapsed_light ?? data.logo_light_small ?? null
  );
  const logoCollapsedDark = resolvePublicAssetUrl(
    data.logo_url_collapsed_dark ?? data.logo_dark_small ?? null
  );

  return {
    ...data,
    logo_url_expanded_light: logoExpandedLight,
    logo_url_expanded_dark: logoExpandedDark,
    logo_url_collapsed_light: logoCollapsedLight,
    logo_url_collapsed_dark: logoCollapsedDark,
    logo_light: logoExpandedLight,
    logo_dark: logoExpandedDark,
    logo_light_small: logoCollapsedLight,
    logo_dark_small: logoCollapsedDark,
    favicon: resolvePublicAssetUrl(data.favicon ?? null),
  };
}

/**
 * Hook para buscar as configuracoes globais do sistema
 * Consumidas por: logo de login, favicon, cor primaria, etc
 */
export function useSystemSettings(name?: string) {
  return useQuery({
    queryKey: ['system_settings', name ?? 'latest'],
    queryFn: async () => {
      const query = supabase.from('system_settings' as any).select('*');

      const { data, error } = name
        ? await query.eq('name', name).single()
        : await query.order('updated_at', { ascending: false }).limit(1).maybeSingle();

      if (error) {
        console.error('Erro ao buscar system_settings:', error);
        return null;
      }

      return normalizeSystemSettings(data);
    },
    staleTime: 1000 * 60 * 60, // 1 hora
    gcTime: 1000 * 60 * 60 * 24, // 24 horas
    retry: 2,
  });
}
