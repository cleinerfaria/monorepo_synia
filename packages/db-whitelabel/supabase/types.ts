// Tipos para as novas tabelas page e page_filter

export type PageFilterType =
  | 'select'
  | 'multiselect'
  | 'input'
  | 'textarea'
  | 'date'
  | 'daterange'
  | 'number'
  | 'checkbox'
  | 'radio';

export type PageFilterSubtype =
  | 'text'
  | 'email'
  | 'phone'
  | 'url'
  | 'password'
  | 'search'
  | 'company'
  | 'user'
  | 'status'
  | 'category'
  | 'tag'
  | 'period'
  | 'custom';

export interface Page {
  id: string;
  company_id: string;
  name: string;
  meta_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface PageFilter {
  id: string;
  company_id: string;
  page_id: string;
  type: PageFilterType;
  subtype?: PageFilterSubtype;
  name: string;
  placeholder?: string;
  sql?: string;
  meta_data?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Tipos para inserção (sem campos auto-gerados)
export type PageInsert = Omit<Page, 'id' | 'created_at' | 'updated_at'>;
export type PageFilterInsert = Omit<PageFilter, 'id' | 'created_at' | 'updated_at'>;

// Tipos para atualização (campos opcionais)
export type PageUpdate = Partial<Omit<Page, 'id' | 'created_at' | 'updated_at'>>;
export type PageFilterUpdate = Partial<Omit<PageFilter, 'id' | 'created_at' | 'updated_at'>>;

// Tipos para configurações globais do sistema
export interface SystemSettings {
  id: string;
  name: string;
  basic_color?: string;
  allow_client_color_adjustment?: boolean;
  allow_client_logo_adjustment?: boolean;
  logo_url_expanded_light?: string;
  logo_url_collapsed_light?: string;
  logo_url_expanded_dark?: string;
  logo_url_collapsed_dark?: string;
  login_frase?: string;
  favicon?: string;
  created_at: string;
  updated_at: string;
}

export type SystemSettingsInsert = Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'>;
export type SystemSettingsUpdate = Partial<
  Omit<SystemSettings, 'id' | 'created_at' | 'updated_at'>
>;
