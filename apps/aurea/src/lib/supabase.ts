import { createClient } from '@supabase/supabase-js';

const isTestEnv = import.meta.env.MODE === 'test';
const fallbackTestUrl = 'https://test-project.supabase.co';
const fallbackTestAnonKey = 'test-anon-key';
const runtimeEnv = typeof window !== 'undefined' ? window.__APP_CONFIG__ : undefined;

export const resolvedSupabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  runtimeEnv?.VITE_SUPABASE_URL ||
  (isTestEnv ? fallbackTestUrl : '');
export const resolvedSupabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  runtimeEnv?.VITE_SUPABASE_ANON_KEY ||
  (isTestEnv ? fallbackTestAnonKey : '');

if (!resolvedSupabaseUrl || !resolvedSupabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client without strict types to avoid inference issues
// Runtime safety is provided by RLS policies and application logic
export const supabase = createClient<any>(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Helper function to get public URL for storage
export const getStorageUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

// Helper function to upload file to storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
): Promise<string | null> => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    console.error('Upload error:', error);
    return null;
  }

  return data.path;
};

// Helper function to delete file from storage
export const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return !error;
};
