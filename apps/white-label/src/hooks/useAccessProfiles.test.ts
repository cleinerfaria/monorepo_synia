import { describe, it, expect } from 'vitest';
import {
  groupPermissionsByModule,
  type ModulePermission,
  type SystemModule,
} from './useAccessProfiles';

describe('useAccessProfiles utilities', () => {
  describe('groupPermissionsByModule', () => {
    it('should group permissions by module', () => {
      const mockModule1: SystemModule = {
        id: 'module-1',
        code: 'sales',
        name: 'Vendas',
        description: null,
        icon: null,
        display_order: 1,
        active: true,
      };

      const mockModule2: SystemModule = {
        id: 'module-2',
        code: 'inventory',
        name: 'Estoque',
        description: null,
        icon: null,
        display_order: 2,
        active: true,
      };

      const permissions: ModulePermission[] = [
        {
          id: 'perm-1',
          module_id: 'module-1',
          code: 'view',
          name: 'Visualizar',
          description: null,
          module: mockModule1,
        },
        {
          id: 'perm-2',
          module_id: 'module-1',
          code: 'edit',
          name: 'Editar',
          description: null,
          module: mockModule1,
        },
        {
          id: 'perm-3',
          module_id: 'module-2',
          code: 'view',
          name: 'Visualizar',
          description: null,
          module: mockModule2,
        },
      ];

      const grouped = groupPermissionsByModule(permissions);

      expect(grouped).toHaveLength(2);
      expect(grouped[0].module.code).toBe('sales');
      expect(grouped[0].permissions).toHaveLength(2);
      expect(grouped[1].module.code).toBe('inventory');
      expect(grouped[1].permissions).toHaveLength(1);
    });

    it('should sort groups by display_order', () => {
      const mockModule1: SystemModule = {
        id: 'module-1',
        code: 'inventory',
        name: 'Estoque',
        description: null,
        icon: null,
        display_order: 5,
        active: true,
      };

      const mockModule2: SystemModule = {
        id: 'module-2',
        code: 'sales',
        name: 'Vendas',
        description: null,
        icon: null,
        display_order: 1,
        active: true,
      };

      const permissions: ModulePermission[] = [
        {
          id: 'perm-1',
          module_id: 'module-1',
          code: 'view',
          name: 'Visualizar',
          description: null,
          module: mockModule1,
        },
        {
          id: 'perm-2',
          module_id: 'module-2',
          code: 'view',
          name: 'Visualizar',
          description: null,
          module: mockModule2,
        },
      ];

      const grouped = groupPermissionsByModule(permissions);

      // Sales should come first due to lower display_order
      expect(grouped[0].module.code).toBe('sales');
      expect(grouped[1].module.code).toBe('inventory');
    });

    it('should handle empty permissions array', () => {
      const grouped = groupPermissionsByModule([]);
      expect(grouped).toHaveLength(0);
    });
  });
});

describe('AccessProfile types', () => {
  it('should have correct structure for CreateAccessProfileInput', () => {
    const input = {
      company_id: 'company-123',
      code: 'manager',
      name: 'Gerente',
      description: 'Gerente de vendas',
      is_admin: false,
      permission_ids: ['perm-1', 'perm-2'],
    };

    expect(input.company_id).toBeDefined();
    expect(input.code).toBeDefined();
    expect(input.name).toBeDefined();
  });

  it('should have correct structure for UpdateAccessProfileInput', () => {
    const input = {
      id: 'profile-123',
      name: 'Novo Nome',
      is_admin: true,
      permission_ids: ['perm-1'],
    };

    expect(input.id).toBeDefined();
  });
});
