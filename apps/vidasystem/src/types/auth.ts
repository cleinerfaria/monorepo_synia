import { Database } from './database';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

export type AppUserWithProfile = Tables<'app_user'> & {
  access_profile?: Pick<Tables<'access_profile'>, 'id' | 'code' | 'name' | 'is_admin'> | null;
};
