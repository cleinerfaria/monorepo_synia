/**
 * Tipos para o sistema de logs de ações de usuários
 */

export type ActionType = 'create' | 'update' | 'delete';

export interface UserActionLog {
  id: string;
  company_id: string;
  user_id: string;
  action: ActionType;
  entity: string;
  entity_id: string | null;
  entity_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface LogActionParams {
  action: ActionType;
  entity: string;
  entityId?: string | null;
  entityName?: string | null;
  oldData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
}

/**
 * Mapeamento de nomes de entidades para exibição
 */
export const ENTITY_LABELS: Record<string, string> = {
  product: 'Produto',
  presentation: 'Apresentação',
  patient: 'Paciente',
  client: 'Cliente',
  supplier: 'Fornecedor',
  manufacturer: 'Fabricante',
  nfe_import: 'NFe',
  stock_movement: 'Movimentação de Estoque',
  stock_location: 'Local de Estoque',
  prescription: 'Receituário',
  professional: 'Profissional',
  equipment: 'Equipamento',
  company: 'Empresa',
  user: 'Usuário',
};

/**
 * Mapeamento de ações para exibição
 */
export const ACTION_LABELS: Record<ActionType, string> = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
};
