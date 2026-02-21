// Tipos para conexões de banco de dados por empresa

// Tipos de banco suportados (enum no PostgreSQL)
export type DbType = 'postgres' | 'mysql' | 'mssql' | 'oracle' | 'sqlite' | 'other';

// Modos SSL suportados (enum no PostgreSQL)
export type SslMode = 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';

export interface CompanyDatabase {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  db_type: DbType;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password?: string; // Apenas para create/update, nunca retornado (view mostra '********')
  db_ssl_mode: SslMode;
  connection_options: Record<string, unknown>;
  is_active: boolean;
  is_default: boolean;
  last_connection_test: string | null;
  last_connection_status: 'success' | 'error' | null;
  last_connection_error: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface CompanyDatabaseCreate {
  company_id: string;
  name: string;
  description?: string;
  db_type?: DbType;
  db_host: string;
  db_port?: number;
  db_name: string;
  db_user: string;
  db_password: string;
  db_ssl_mode?: SslMode;
  connection_options?: Record<string, unknown>;
  is_active?: boolean;
  is_default?: boolean;
}

export interface CompanyDatabaseUpdate {
  name?: string;
  description?: string;
  db_type?: DbType;
  db_host?: string;
  db_port?: number;
  db_name?: string;
  db_user?: string;
  db_password?: string;
  db_ssl_mode?: SslMode;
  connection_options?: Record<string, unknown>;
  is_active?: boolean;
  is_default?: boolean;
}

// Labels para exibição dos tipos de banco
export const DB_TYPE_LABELS: Record<DbType, string> = {
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  mssql: 'SQL Server',
  oracle: 'Oracle',
  sqlite: 'SQLite',
  other: 'Outro',
};

// Labels para exibição dos modos SSL
export const SSL_MODE_LABELS: Record<SslMode, string> = {
  disable: 'Desabilitado',
  allow: 'Permitir',
  prefer: 'Preferir',
  require: 'Obrigatório',
  'verify-ca': 'Verificar CA',
  'verify-full': 'Verificação Completa',
};

export interface DatabaseConnectionTestResult {
  status: 'success' | 'error';
  error: string | null;
  tested_at: string;
}

export interface DatabaseQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  columns: string[];
}
