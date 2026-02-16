export interface UserActionLog {
  id: string;
  company_id: string;
  user_id?: string;
  action: 'create' | 'update' | 'delete';
  entity: string;
  entity_id?: string;
  entity_name?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  app_user?: {
    name: string;
    email: string;
  };
}

export interface LogActionParams {
  action: 'create' | 'update' | 'delete';
  entity: string;
  entityId?: string;
  entityName?: string;
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
}
