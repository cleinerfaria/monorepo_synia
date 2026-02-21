import { supabase } from '@/lib/supabase';

export async function getValidAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  const shouldRefresh = expiresAt > 0 && expiresAt - Date.now() < 60_000;

  if (shouldRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return null;
    return data.session?.access_token || null;
  }

  return session.access_token || null;
}
