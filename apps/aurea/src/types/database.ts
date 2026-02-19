export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.1';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      access_profile: {
        Row: {
          active: boolean | null;
          code: string;
          company_id: string | null;
          created_at: string | null;
          description: string | null;
          id: string;
          is_admin: boolean | null;
          is_system: boolean | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          code: string;
          company_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_admin?: boolean | null;
          is_system?: boolean | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          code?: string;
          company_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_admin?: boolean | null;
          is_system?: boolean | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'access_profile_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'access_profile_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'access_profile_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      access_profile_permission: {
        Row: {
          created_at: string | null;
          id: string;
          permission_id: string;
          profile_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          permission_id: string;
          profile_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          permission_id?: string;
          profile_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'access_profile_permission_permission_id_fkey';
            columns: ['permission_id'];
            isOneToOne: false;
            referencedRelation: 'module_permission';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'access_profile_permission_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'access_profile';
            referencedColumns: ['id'];
          },
        ];
      };
      active_ingredient: {
        Row: {
          active: boolean | null;
          cas_number: string | null;
          code: string | null;
          company_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          therapeutic_class: string | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          cas_number?: string | null;
          code?: string | null;
          company_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          therapeutic_class?: string | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          cas_number?: string | null;
          code?: string | null;
          company_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          therapeutic_class?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'active_ingredient_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'active_ingredient_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'active_ingredient_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      administration_routes: {
        Row: {
          abbreviation: string | null;
          active: boolean | null;
          company_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          prescription_order: number | null;
          updated_at: string | null;
        };
        Insert: {
          abbreviation?: string | null;
          active?: boolean | null;
          company_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          prescription_order?: number | null;
          updated_at?: string | null;
        };
        Update: {
          abbreviation?: string | null;
          active?: boolean | null;
          company_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          prescription_order?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'administration_routes_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'administration_routes_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'administration_routes_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      app_user: {
        Row: {
          access_profile_id: string | null;
          active: boolean | null;
          auth_user_id: string;
          company_id: string;
          created_at: string | null;
          email: string;
          id: string;
          name: string;
          role: string;
          theme: 'light' | 'dark' | 'system';
          updated_at: string | null;
        };
        Insert: {
          access_profile_id?: string | null;
          active?: boolean | null;
          auth_user_id: string;
          company_id: string;
          created_at?: string | null;
          email: string;
          id?: string;
          name: string;
          role?: string;
          theme?: 'light' | 'dark' | 'system' | null;
          updated_at?: string | null;
        };
        Update: {
          access_profile_id?: string | null;
          active?: boolean | null;
          auth_user_id?: string;
          company_id?: string;
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string;
          role?: string;
          theme?: 'light' | 'dark' | 'system' | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'app_user_access_profile_id_fkey';
            columns: ['access_profile_id'];
            isOneToOne: false;
            referencedRelation: 'access_profile';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'app_user_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'app_user_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'app_user_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      calendar: {
        Row: {
          created_at: string;
          id: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
        };
        Update: {
          created_at?: string;
          id?: number;
        };
        Relationships: [];
      };
      client: {
        Row: {
          active: boolean | null;
          ans_code: string | null;
          city: string | null;
          code: string | null;
          color: string | null;
          company_id: string;
          complement: string | null;
          created_at: string | null;
          district: string | null;
          document: string | null;
          email: string | null;
          id: string;
          logo_url: string | null;
          name: string;
          number: string | null;
          phone: string | null;
          state: string | null;
          street: string | null;
          tiss: string | null;
          type: string;
          updated_at: string | null;
          zip: string | null;
        };
        Insert: {
          active?: boolean | null;
          ans_code?: string | null;
          city?: string | null;
          code?: string | null;
          color?: string | null;
          company_id: string;
          complement?: string | null;
          created_at?: string | null;
          district?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          name: string;
          number?: string | null;
          phone?: string | null;
          state?: string | null;
          street?: string | null;
          tiss?: string | null;
          type: string;
          updated_at?: string | null;
          zip?: string | null;
        };
        Update: {
          active?: boolean | null;
          ans_code?: string | null;
          city?: string | null;
          code?: string | null;
          color?: string | null;
          company_id?: string;
          complement?: string | null;
          created_at?: string | null;
          district?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          logo_url?: string | null;
          name?: string;
          number?: string | null;
          phone?: string | null;
          state?: string | null;
          street?: string | null;
          tiss?: string | null;
          type?: string;
          updated_at?: string | null;
          zip?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'client_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'client_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      client_contact: {
        Row: {
          active: boolean;
          can_receive_updates: boolean;
          client_id: string;
          company_id: string;
          created_at: string;
          department: string | null;
          id: string;
          is_primary: boolean;
          name: string | null;
          notes: string | null;
          position: string | null;
          type: Database['public']['Enums']['client_contact_type'];
          updated_at: string;
          value: string;
        };
        Insert: {
          active?: boolean;
          can_receive_updates?: boolean;
          client_id: string;
          company_id: string;
          created_at?: string;
          department?: string | null;
          id?: string;
          is_primary?: boolean;
          name?: string | null;
          notes?: string | null;
          position?: string | null;
          type?: Database['public']['Enums']['client_contact_type'];
          updated_at?: string;
          value: string;
        };
        Update: {
          active?: boolean;
          can_receive_updates?: boolean;
          client_id?: string;
          company_id?: string;
          created_at?: string;
          department?: string | null;
          id?: string;
          is_primary?: boolean;
          name?: string | null;
          notes?: string | null;
          position?: string | null;
          type?: Database['public']['Enums']['client_contact_type'];
          updated_at?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'client_contact_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_contact_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'client_contact_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'client_contact_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      company: {
        Row: {
          care_modality: string | null;
          cnae: string | null;
          cnes: string | null;
          company_unit_id: string | null;
          created_at: string | null;
          document: string | null;
          email: string | null;
          id: string;
          is_active: boolean | null;
          logo_url_collapsed: string | null;
          logo_url_expanded: string | null;
          name: string;
          primary_color: string | null;
          special_tax_regime: string | null;
          state_registration: string | null;
          tax_regime: string | null;
          taxation_nature: string | null;
          theme_preference: string | null;
          trade_name: string | null;
          updated_at: string | null;
          website: string | null;
        };
        Insert: {
          care_modality?: string | null;
          cnae?: string | null;
          cnes?: string | null;
          company_unit_id?: string | null;
          created_at?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          logo_url_collapsed?: string | null;
          logo_url_expanded?: string | null;
          name: string;
          primary_color?: string | null;
          special_tax_regime?: string | null;
          state_registration?: string | null;
          tax_regime?: string | null;
          taxation_nature?: string | null;
          theme_preference?: string | null;
          trade_name?: string | null;
          updated_at?: string | null;
          website?: string | null;
        };
        Update: {
          care_modality?: string | null;
          cnae?: string | null;
          cnes?: string | null;
          company_unit_id?: string | null;
          created_at?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          is_active?: boolean | null;
          logo_url_collapsed?: string | null;
          logo_url_expanded?: string | null;
          name?: string;
          primary_color?: string | null;
          special_tax_regime?: string | null;
          state_registration?: string | null;
          tax_regime?: string | null;
          taxation_nature?: string | null;
          theme_preference?: string | null;
          trade_name?: string | null;
          updated_at?: string | null;
          website?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'company_company_unit_id_fkey';
            columns: ['company_unit_id'];
            isOneToOne: false;
            referencedRelation: 'company_unit';
            referencedColumns: ['id'];
          },
        ];
      };
      company_unit: {
        Row: {
          address: string | null;
          city: string | null;
          complement: string | null;
          created_at: string | null;
          document: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          neiborhood: string | null;
          number: string | null;
          postal_code: string | null;
          state: string | null;
          trade_name: string | null;
          unit_type: Database['public']['Enums']['enum_company_unit_type'];
          updated_at: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          complement?: string | null;
          created_at?: string | null;
          document?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          neiborhood?: string | null;
          number?: string | null;
          postal_code?: string | null;
          state?: string | null;
          trade_name?: string | null;
          unit_type?: Database['public']['Enums']['enum_company_unit_type'];
          updated_at?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          complement?: string | null;
          created_at?: string | null;
          document?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          neiborhood?: string | null;
          number?: string | null;
          postal_code?: string | null;
          state?: string | null;
          trade_name?: string | null;
          unit_type?: Database['public']['Enums']['enum_company_unit_type'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      equipment: {
        Row: {
          assigned_at: string | null;
          assigned_patient_id: string | null;
          code: string | null;
          company_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          patrimony_code: string | null;
          serial_number: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          assigned_at?: string | null;
          assigned_patient_id?: string | null;
          code?: string | null;
          company_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          patrimony_code?: string | null;
          serial_number?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          assigned_at?: string | null;
          assigned_patient_id?: string | null;
          code?: string | null;
          company_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          patrimony_code?: string | null;
          serial_number?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'equipment_assigned_patient_id_fkey';
            columns: ['assigned_patient_id'];
            isOneToOne: false;
            referencedRelation: 'patient';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'equipment_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'equipment_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'equipment_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      manufacturer: {
        Row: {
          active: boolean | null;
          anvisa_authorization: string | null;
          brasindice_code: string | null;
          city: string | null;
          code: string | null;
          company_id: string;
          complement: string | null;
          created_at: string | null;
          district: string | null;
          document: string | null;
          email: string | null;
          id: string;
          name: string;
          notes: string | null;
          number: string | null;
          phone: string | null;
          state: string | null;
          street: string | null;
          trade_name: string | null;
          updated_at: string | null;
          website: string | null;
          zip: string | null;
        };
        Insert: {
          active?: boolean | null;
          anvisa_authorization?: string | null;
          brasindice_code?: string | null;
          city?: string | null;
          code?: string | null;
          company_id: string;
          complement?: string | null;
          created_at?: string | null;
          district?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          notes?: string | null;
          number?: string | null;
          phone?: string | null;
          state?: string | null;
          street?: string | null;
          trade_name?: string | null;
          updated_at?: string | null;
          website?: string | null;
          zip?: string | null;
        };
        Update: {
          active?: boolean | null;
          anvisa_authorization?: string | null;
          brasindice_code?: string | null;
          city?: string | null;
          code?: string | null;
          company_id?: string;
          complement?: string | null;
          created_at?: string | null;
          district?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          number?: string | null;
          phone?: string | null;
          state?: string | null;
          street?: string | null;
          trade_name?: string | null;
          updated_at?: string | null;
          website?: string | null;
          zip?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'manufacturer_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'manufacturer_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'manufacturer_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      module_permission: {
        Row: {
          code: string;
          description: string | null;
          id: string;
          module_id: string;
          name: string;
        };
        Insert: {
          code: string;
          description?: string | null;
          id?: string;
          module_id: string;
          name: string;
        };
        Update: {
          code?: string;
          description?: string | null;
          id?: string;
          module_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'module_permission_module_id_fkey';
            columns: ['module_id'];
            isOneToOne: false;
            referencedRelation: 'system_module';
            referencedColumns: ['id'];
          },
        ];
      };
      nfe_import: {
        Row: {
          access_key: string | null;
          company_id: string;
          created_at: string | null;
          error_message: string | null;
          id: string;
          issued_at: string | null;
          issuer_document: string | null;
          issuer_name: string | null;
          number: string | null;
          status: string;
          supplier_id: string | null;
          total_value: number | null;
          updated_at: string | null;
          xml_url: string | null;
        };
        Insert: {
          access_key?: string | null;
          company_id: string;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          issued_at?: string | null;
          issuer_document?: string | null;
          issuer_name?: string | null;
          number?: string | null;
          status?: string;
          supplier_id?: string | null;
          total_value?: number | null;
          updated_at?: string | null;
          xml_url?: string | null;
        };
        Update: {
          access_key?: string | null;
          company_id?: string;
          created_at?: string | null;
          error_message?: string | null;
          id?: string;
          issued_at?: string | null;
          issuer_document?: string | null;
          issuer_name?: string | null;
          number?: string | null;
          status?: string;
          supplier_id?: string | null;
          total_value?: number | null;
          updated_at?: string | null;
          xml_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'nfe_import_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'nfe_import_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'nfe_import_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'nfe_import_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'supplier';
            referencedColumns: ['id'];
          },
        ];
      };
      nfe_import_item: {
        Row: {
          anvisa_code: string | null;
          batch_number: string | null;
          company_id: string;
          created_at: string | null;
          ean: string | null;
          expiration_date: string | null;
          id: string;
          item_number: number | null;
          manufacture_date: string | null;
          ncm: string | null;
          nfe_import_id: string;
          pmc_price: number | null;
          presentation_id: string | null;
          product_code: string | null;
          product_id: string | null;
          qty: number;
          raw_description: string;
          total_price: number;
          unit: string | null;
          unit_price: number;
        };
        Insert: {
          anvisa_code?: string | null;
          batch_number?: string | null;
          company_id: string;
          created_at?: string | null;
          ean?: string | null;
          expiration_date?: string | null;
          id?: string;
          item_number?: number | null;
          manufacture_date?: string | null;
          ncm?: string | null;
          nfe_import_id: string;
          pmc_price?: number | null;
          presentation_id?: string | null;
          product_code?: string | null;
          product_id?: string | null;
          qty: number;
          raw_description: string;
          total_price: number;
          unit?: string | null;
          unit_price: number;
        };
        Update: {
          anvisa_code?: string | null;
          batch_number?: string | null;
          company_id?: string;
          created_at?: string | null;
          ean?: string | null;
          expiration_date?: string | null;
          id?: string;
          item_number?: number | null;
          manufacture_date?: string | null;
          ncm?: string | null;
          nfe_import_id?: string;
          pmc_price?: number | null;
          presentation_id?: string | null;
          product_code?: string | null;
          product_id?: string | null;
          qty?: number;
          raw_description?: string;
          total_price?: number;
          unit?: string | null;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'nfe_import_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'nfe_import_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'nfe_import_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'nfe_import_item_nfe_import_id_fkey';
            columns: ['nfe_import_id'];
            isOneToOne: false;
            referencedRelation: 'nfe_import';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'nfe_import_item_presentation_id_fkey';
            columns: ['presentation_id'];
            isOneToOne: false;
            referencedRelation: 'product_presentation';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'nfe_import_item_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
        ];
      };
      patient: {
        Row: {
          active: boolean | null;
          address: string | null;
          billing_client_id: string | null;
          birth_date: string | null;
          code: string | null;
          company_id: string;
          cpf: string | null;
          created_at: string | null;
          email: string | null;
          father_name: string | null;
          gender: Database['public']['Enums']['gender_type'] | null;
          id: string;
          mother_name: string | null;
          name: string;
          name_normalized: string | null;
          phone: string | null;
          race: Database['public']['Enums']['race_type'];
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          address?: string | null;
          billing_client_id?: string | null;
          birth_date?: string | null;
          code?: string | null;
          company_id: string;
          cpf?: string | null;
          created_at?: string | null;
          email?: string | null;
          father_name?: string | null;
          gender?: Database['public']['Enums']['gender_type'] | null;
          id?: string;
          mother_name?: string | null;
          name: string;
          name_normalized?: string | null;
          phone?: string | null;
          race?: Database['public']['Enums']['race_type'];
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          address?: string | null;
          billing_client_id?: string | null;
          birth_date?: string | null;
          code?: string | null;
          company_id?: string;
          cpf?: string | null;
          created_at?: string | null;
          email?: string | null;
          father_name?: string | null;
          gender?: Database['public']['Enums']['gender_type'] | null;
          id?: string;
          mother_name?: string | null;
          name?: string;
          name_normalized?: string | null;
          phone?: string | null;
          race?: Database['public']['Enums']['race_type'];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_billing_client_id_fkey';
            columns: ['billing_client_id'];
            isOneToOne: false;
            referencedRelation: 'client';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      patient_address: {
        Row: {
          active: boolean;
          city: string | null;
          company_id: string;
          complement: string | null;
          country: string | null;
          created_at: string;
          district: string | null;
          id: string;
          is_primary: boolean;
          label: string | null;
          latitude: number | null;
          longitude: number | null;
          number: string | null;
          patient_id: string;
          reference: string | null;
          state: string | null;
          street: string | null;
          type: Database['public']['Enums']['patient_address_type'];
          updated_at: string;
          use_for_service: boolean;
          zip: string | null;
        };
        Insert: {
          active?: boolean;
          city?: string | null;
          company_id: string;
          complement?: string | null;
          country?: string | null;
          created_at?: string;
          district?: string | null;
          id?: string;
          is_primary?: boolean;
          label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          number?: string | null;
          patient_id: string;
          reference?: string | null;
          state?: string | null;
          street?: string | null;
          type?: Database['public']['Enums']['patient_address_type'];
          updated_at?: string;
          use_for_service?: boolean;
          zip?: string | null;
        };
        Update: {
          active?: boolean;
          city?: string | null;
          company_id?: string;
          complement?: string | null;
          country?: string | null;
          created_at?: string;
          district?: string | null;
          id?: string;
          is_primary?: boolean;
          label?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          number?: string | null;
          patient_id?: string;
          reference?: string | null;
          state?: string | null;
          street?: string | null;
          type?: Database['public']['Enums']['patient_address_type'];
          updated_at?: string;
          use_for_service?: boolean;
          zip?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_address_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_address_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_address_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_address_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patient';
            referencedColumns: ['id'];
          },
        ];
      };
      patient_consumption: {
        Row: {
          company_id: string;
          consumed_at: string | null;
          created_at: string | null;
          id: string;
          location_id: string | null;
          notes: string | null;
          patient_id: string;
          product_id: string;
          qty: number;
        };
        Insert: {
          company_id: string;
          consumed_at?: string | null;
          created_at?: string | null;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          patient_id: string;
          product_id: string;
          qty: number;
        };
        Update: {
          company_id?: string;
          consumed_at?: string | null;
          created_at?: string | null;
          id?: string;
          location_id?: string | null;
          notes?: string | null;
          patient_id?: string;
          product_id?: string;
          qty?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_consumption_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_consumption_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_consumption_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_consumption_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'stock_location';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_consumption_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patient';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_consumption_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
        ];
      };
      patient_contact: {
        Row: {
          active: boolean;
          can_receive_updates: boolean;
          company_id: string;
          created_at: string;
          id: string;
          is_primary: boolean;
          name: string | null;
          notes: string | null;
          patient_id: string;
          relationship: string | null;
          type: Database['public']['Enums']['patient_contact_type'];
          updated_at: string;
          value: string;
        };
        Insert: {
          active?: boolean;
          can_receive_updates?: boolean;
          company_id: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          name?: string | null;
          notes?: string | null;
          patient_id: string;
          relationship?: string | null;
          type?: Database['public']['Enums']['patient_contact_type'];
          updated_at?: string;
          value: string;
        };
        Update: {
          active?: boolean;
          can_receive_updates?: boolean;
          company_id?: string;
          created_at?: string;
          id?: string;
          is_primary?: boolean;
          name?: string | null;
          notes?: string | null;
          patient_id?: string;
          relationship?: string | null;
          type?: Database['public']['Enums']['patient_contact_type'];
          updated_at?: string;
          value?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_contact_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_contact_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_contact_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_contact_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patient';
            referencedColumns: ['id'];
          },
        ];
      };
      patient_identifier: {
        Row: {
          active: boolean;
          company_id: string;
          created_at: string;
          id: string;
          identifier: string;
          notes: string | null;
          patient_id: string;
          source: string;
          type: Database['public']['Enums']['patient_identifier_type'];
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          company_id: string;
          created_at?: string;
          id?: string;
          identifier: string;
          notes?: string | null;
          patient_id: string;
          source: string;
          type?: Database['public']['Enums']['patient_identifier_type'];
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          company_id?: string;
          created_at?: string;
          id?: string;
          identifier?: string;
          notes?: string | null;
          patient_id?: string;
          source?: string;
          type?: Database['public']['Enums']['patient_identifier_type'];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_identifier_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_identifier_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_identifier_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_identifier_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patient';
            referencedColumns: ['id'];
          },
        ];
      };
      patient_payer: {
        Row: {
          active: boolean;
          client_id: string;
          company_id: string;
          coverage_percent: number | null;
          created_at: string;
          end_date: string | null;
          id: string;
          is_primary: boolean;
          notes: string | null;
          patient_id: string;
          start_date: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          client_id: string;
          company_id: string;
          coverage_percent?: number | null;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          is_primary?: boolean;
          notes?: string | null;
          patient_id: string;
          start_date?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          client_id?: string;
          company_id?: string;
          coverage_percent?: number | null;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          is_primary?: boolean;
          notes?: string | null;
          patient_id?: string;
          start_date?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'patient_payer_client_id_fkey';
            columns: ['client_id'];
            isOneToOne: false;
            referencedRelation: 'client';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_payer_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'patient_payer_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_payer_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'patient_payer_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patient';
            referencedColumns: ['id'];
          },
        ];
      };
      prescription: {
        Row: {
          attachment_url: string | null;
          company_id: string;
          created_at: string | null;
          end_date: string | null;
          id: string;
          notes: string | null;
          patient_id: string;
          professional_id: string | null;
          start_date: string | null;
          status: string;
          type: Database['public']['Enums']['enum_prescription_type'] | null;
          updated_at: string | null;
        };
        Insert: {
          attachment_url?: string | null;
          company_id: string;
          created_at?: string | null;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          patient_id: string;
          professional_id?: string | null;
          start_date?: string | null;
          status?: string;
          type?: Database['public']['Enums']['enum_prescription_type'] | null;
          updated_at?: string | null;
        };
        Update: {
          attachment_url?: string | null;
          company_id?: string;
          created_at?: string | null;
          end_date?: string | null;
          id?: string;
          notes?: string | null;
          patient_id?: string;
          professional_id?: string | null;
          start_date?: string | null;
          status?: string;
          type?: Database['public']['Enums']['enum_prescription_type'] | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prescription_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'prescription_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'prescription_patient_id_fkey';
            columns: ['patient_id'];
            isOneToOne: false;
            referencedRelation: 'patient';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_professional_id_fkey';
            columns: ['professional_id'];
            isOneToOne: false;
            referencedRelation: 'professional';
            referencedColumns: ['id'];
          },
        ];
      };
      prescription_item: {
        Row: {
          company_id: string;
          created_at: string | null;
          diluent_text: string | null;
          end_date: string | null;
          equipment_id: string | null;
          frequency_mode: Database['public']['Enums']['enum_prescription_frequency_mode'] | null;
          id: string;
          instructions_pharmacy: string | null;
          instructions_use: string | null;
          interval_minutes: number | null;
          is_active: boolean;
          is_continuous_use: boolean;
          is_prn: boolean;
          item_order: number | null;
          item_type: Database['public']['Enums']['enum_prescription_item_type'];
          justification: string | null;
          prescription_id: string;
          procedure_id: string | null;
          product_id: string | null;
          quantity: number | null;
          route_id: string | null;
          start_date: string | null;
          supplier: Database['public']['Enums']['enum_prescription_item_supplier'] | null;
          time_checks: string[] | null;
          time_start: string | null;
          times_unit: Database['public']['Enums']['enum_prescription_times_unit'] | null;
          times_value: number | null;
          updated_at: string | null;
          week_days: number[] | null;
        };
        Insert: {
          company_id: string;
          created_at?: string | null;
          diluent_text?: string | null;
          end_date?: string | null;
          equipment_id?: string | null;
          frequency_mode?: Database['public']['Enums']['enum_prescription_frequency_mode'] | null;
          id?: string;
          instructions_pharmacy?: string | null;
          instructions_use?: string | null;
          interval_minutes?: number | null;
          is_active?: boolean;
          is_continuous_use?: boolean;
          is_prn?: boolean;
          item_order?: number | null;
          item_type: Database['public']['Enums']['enum_prescription_item_type'];
          justification?: string | null;
          prescription_id: string;
          procedure_id?: string | null;
          product_id?: string | null;
          quantity?: number | null;
          route_id?: string | null;
          start_date?: string | null;
          supplier?: Database['public']['Enums']['enum_prescription_item_supplier'] | null;
          time_checks?: string[] | null;
          time_start?: string | null;
          times_unit?: Database['public']['Enums']['enum_prescription_times_unit'] | null;
          times_value?: number | null;
          updated_at?: string | null;
          week_days?: number[] | null;
        };
        Update: {
          company_id?: string;
          created_at?: string | null;
          diluent_text?: string | null;
          end_date?: string | null;
          equipment_id?: string | null;
          frequency_mode?: Database['public']['Enums']['enum_prescription_frequency_mode'] | null;
          id?: string;
          instructions_pharmacy?: string | null;
          instructions_use?: string | null;
          interval_minutes?: number | null;
          is_active?: boolean;
          is_continuous_use?: boolean;
          is_prn?: boolean;
          item_order?: number | null;
          item_type?: Database['public']['Enums']['enum_prescription_item_type'];
          justification?: string | null;
          prescription_id?: string;
          procedure_id?: string | null;
          product_id?: string | null;
          quantity?: number | null;
          route_id?: string | null;
          start_date?: string | null;
          supplier?: Database['public']['Enums']['enum_prescription_item_supplier'] | null;
          time_checks?: string[] | null;
          time_start?: string | null;
          times_unit?: Database['public']['Enums']['enum_prescription_times_unit'] | null;
          times_value?: number | null;
          updated_at?: string | null;
          week_days?: number[] | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prescription_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'prescription_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'prescription_item_equipment_id_fkey';
            columns: ['equipment_id'];
            isOneToOne: false;
            referencedRelation: 'equipment';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_item_prescription_id_fkey';
            columns: ['prescription_id'];
            isOneToOne: false;
            referencedRelation: 'prescription';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_item_procedure_id_fkey';
            columns: ['procedure_id'];
            isOneToOne: false;
            referencedRelation: 'procedure';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_item_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_item_route_id_fkey';
            columns: ['route_id'];
            isOneToOne: false;
            referencedRelation: 'administration_routes';
            referencedColumns: ['id'];
          },
        ];
      };
      prescription_item_component: {
        Row: {
          company_id: string;
          created_at: string | null;
          id: string;
          prescription_item_id: string;
          product_id: string | null;
          quantity: number | null;
          updated_at: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string | null;
          id?: string;
          prescription_item_id: string;
          product_id?: string | null;
          quantity?: number | null;
          updated_at?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string | null;
          id?: string;
          prescription_item_id?: string;
          product_id?: string | null;
          quantity?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prescription_item_component_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_item_component_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'prescription_item_component_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'prescription_item_component_prescription_item_id_fkey';
            columns: ['prescription_item_id'];
            isOneToOne: false;
            referencedRelation: 'prescription_item';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'prescription_item_component_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
        ];
      };
      procedure: {
        Row: {
          active: boolean;
          category: Database['public']['Enums']['procedure_category'];
          code: string | null;
          company_id: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          unit_id: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          category: Database['public']['Enums']['procedure_category'];
          code?: string | null;
          company_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          unit_id?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          category?: Database['public']['Enums']['procedure_category'];
          code?: string | null;
          company_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          unit_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'procedure_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'procedure_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'procedure_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'procedure_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'unit_of_measure';
            referencedColumns: ['id'];
          },
        ];
      };
      product: {
        Row: {
          active: boolean | null;
          active_ingredient_id: string | null;
          antibiotic: boolean | null;
          code: string | null;
          company_id: string;
          concentration: string | null;
          created_at: string | null;
          description: string | null;
          group_id: string | null;
          id: string;
          item_type: string;
          min_stock: number | null;
          name: string;
          psychotropic: boolean | null;
          tiss_ref: string | null;
          tuss_ref: string | null;
          unit_prescription_factor: number;
          unit_prescription_id: string | null;
          unit_stock_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          active_ingredient_id?: string | null;
          antibiotic?: boolean | null;
          code?: string | null;
          company_id: string;
          concentration?: string | null;
          created_at?: string | null;
          description?: string | null;
          group_id?: string | null;
          id?: string;
          item_type: string;
          min_stock?: number | null;
          name: string;
          psychotropic?: boolean | null;
          tiss_ref?: string | null;
          tuss_ref?: string | null;
          unit_prescription_factor?: number;
          unit_prescription_id?: string | null;
          unit_stock_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          active_ingredient_id?: string | null;
          antibiotic?: boolean | null;
          code?: string | null;
          company_id?: string;
          concentration?: string | null;
          created_at?: string | null;
          description?: string | null;
          group_id?: string | null;
          id?: string;
          item_type?: string;
          min_stock?: number | null;
          name?: string;
          psychotropic?: boolean | null;
          tiss_ref?: string | null;
          tuss_ref?: string | null;
          unit_prescription_factor?: number;
          unit_prescription_id?: string | null;
          unit_stock_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'product_active_ingredient_id_fkey';
            columns: ['active_ingredient_id'];
            isOneToOne: false;
            referencedRelation: 'active_ingredient';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'product_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'product_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'product_group';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_unit_prescription_id_fkey';
            columns: ['unit_prescription_id'];
            isOneToOne: false;
            referencedRelation: 'unit_of_measure';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_unit_stock_id_fkey';
            columns: ['unit_stock_id'];
            isOneToOne: false;
            referencedRelation: 'unit_of_measure';
            referencedColumns: ['id'];
          },
        ];
      };
      product_group: {
        Row: {
          active: boolean | null;
          code: string | null;
          color: string | null;
          company_id: string | null;
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          is_system: boolean | null;
          name: string;
          parent_id: string | null;
          sort_order: number | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          code?: string | null;
          color?: string | null;
          company_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_system?: boolean | null;
          name: string;
          parent_id?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          code?: string | null;
          color?: string | null;
          company_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          is_system?: boolean | null;
          name?: string;
          parent_id?: string | null;
          sort_order?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'product_group_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_group_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'product_group_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'product_group_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'product_group';
            referencedColumns: ['id'];
          },
        ];
      };
      product_presentation: {
        Row: {
          active: boolean | null;
          barcode: string | null;
          company_id: string;
          conversion_factor: number;
          created_at: string | null;
          id: string;
          manufacturer_id: string | null;
          name: string;
          product_id: string;
          supplier_name: string | null;
          unit: string | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          barcode?: string | null;
          company_id: string;
          conversion_factor?: number;
          created_at?: string | null;
          id?: string;
          manufacturer_id?: string | null;
          name: string;
          product_id: string;
          supplier_name?: string | null;
          unit?: string | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          barcode?: string | null;
          company_id?: string;
          conversion_factor?: number;
          created_at?: string | null;
          id?: string;
          manufacturer_id?: string | null;
          name?: string;
          product_id?: string;
          supplier_name?: string | null;
          unit?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'product_presentation_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_presentation_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'product_presentation_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'product_presentation_manufacturer_id_fkey';
            columns: ['manufacturer_id'];
            isOneToOne: false;
            referencedRelation: 'manufacturer';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_presentation_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
        ];
      };
      product_ref_link: {
        Row: {
          company_id: string;
          conversion_factor: number | null;
          created_at: string | null;
          id: string;
          is_primary: boolean;
          notes: string | null;
          product_id: string;
          ref_item_id: string;
          source_id: string;
          updated_at: string | null;
        };
        Insert: {
          company_id: string;
          conversion_factor?: number | null;
          created_at?: string | null;
          id?: string;
          is_primary?: boolean;
          notes?: string | null;
          product_id: string;
          ref_item_id: string;
          source_id: string;
          updated_at?: string | null;
        };
        Update: {
          company_id?: string;
          conversion_factor?: number | null;
          created_at?: string | null;
          id?: string;
          is_primary?: boolean;
          notes?: string | null;
          product_id?: string;
          ref_item_id?: string;
          source_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'product_ref_link_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_ref_link_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'product_ref_link_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'product_ref_link_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_ref_link_ref_item_id_fkey';
            columns: ['ref_item_id'];
            isOneToOne: false;
            referencedRelation: 'ref_item';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_ref_link_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'ref_source';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_ref_link_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_source_stats';
            referencedColumns: ['source_id'];
          },
        ];
      };
      professional: {
        Row: {
          active: boolean | null;
          code: string | null;
          company_id: string;
          council_number: string | null;
          council_type: string | null;
          council_uf: string | null;
          created_at: string | null;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          role: string | null;
          signature_path: string | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          code?: string | null;
          company_id: string;
          council_number?: string | null;
          council_type?: string | null;
          council_uf?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          role?: string | null;
          signature_path?: string | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          code?: string | null;
          company_id?: string;
          council_number?: string | null;
          council_type?: string | null;
          council_uf?: string | null;
          created_at?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          role?: string | null;
          signature_path?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'professional_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'professional_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'professional_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      ref_import_batch: {
        Row: {
          company_id: string;
          created_at: string | null;
          created_by: string | null;
          error_summary: string | null;
          file_hash: string | null;
          file_name: string | null;
          file_path: string | null;
          file_size: number | null;
          finished_at: string | null;
          id: string;
          import_options: Json | null;
          rows_error: number | null;
          rows_inserted: number | null;
          rows_read: number | null;
          rows_skipped: number | null;
          rows_updated: number | null;
          source_id: string;
          started_at: string | null;
          status: string;
          updated_at: string | null;
        };
        Insert: {
          company_id: string;
          created_at?: string | null;
          created_by?: string | null;
          error_summary?: string | null;
          file_hash?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          finished_at?: string | null;
          id?: string;
          import_options?: Json | null;
          rows_error?: number | null;
          rows_inserted?: number | null;
          rows_read?: number | null;
          rows_skipped?: number | null;
          rows_updated?: number | null;
          source_id: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Update: {
          company_id?: string;
          created_at?: string | null;
          created_by?: string | null;
          error_summary?: string | null;
          file_hash?: string | null;
          file_name?: string | null;
          file_path?: string | null;
          file_size?: number | null;
          finished_at?: string | null;
          id?: string;
          import_options?: Json | null;
          rows_error?: number | null;
          rows_inserted?: number | null;
          rows_read?: number | null;
          rows_skipped?: number | null;
          rows_updated?: number | null;
          source_id?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ref_import_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_import_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'ref_import_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'ref_import_batch_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'app_user';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_import_batch_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'ref_source';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_import_batch_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_source_stats';
            referencedColumns: ['source_id'];
          },
        ];
      };
      ref_import_error: {
        Row: {
          batch_id: string;
          created_at: string | null;
          error_message: string | null;
          error_type: string | null;
          id: string;
          raw_data: Json | null;
          row_number: number | null;
        };
        Insert: {
          batch_id: string;
          created_at?: string | null;
          error_message?: string | null;
          error_type?: string | null;
          id?: string;
          raw_data?: Json | null;
          row_number?: number | null;
        };
        Update: {
          batch_id?: string;
          created_at?: string | null;
          error_message?: string | null;
          error_type?: string | null;
          id?: string;
          raw_data?: Json | null;
          row_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ref_import_error_batch_id_fkey';
            columns: ['batch_id'];
            isOneToOne: false;
            referencedRelation: 'ref_import_batch';
            referencedColumns: ['id'];
          },
        ];
      };
      ref_item: {
        Row: {
          base_unit: string | null;
          category: string | null;
          company_id: string;
          concentration: string | null;
          created_at: string | null;
          ean: string | null;
          entry_unit: string | null;
          external_code: string;
          extra_data: Json | null;
          first_import_batch_id: string | null;
          id: string;
          is_active: boolean | null;
          last_import_batch_id: string | null;
          manufacturer_code: string | null;
          manufacturer_name: string | null;
          presentation: string | null;
          product_name: string;
          quantity: number | null;
          source_id: string;
          subcategory: string | null;
          tiss: string | null;
          tuss: string | null;
          updated_at: string | null;
        };
        Insert: {
          base_unit?: string | null;
          category?: string | null;
          company_id: string;
          concentration?: string | null;
          created_at?: string | null;
          ean?: string | null;
          entry_unit?: string | null;
          external_code: string;
          extra_data?: Json | null;
          first_import_batch_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_import_batch_id?: string | null;
          manufacturer_code?: string | null;
          manufacturer_name?: string | null;
          presentation?: string | null;
          product_name: string;
          quantity?: number | null;
          source_id: string;
          subcategory?: string | null;
          tiss?: string | null;
          tuss?: string | null;
          updated_at?: string | null;
        };
        Update: {
          base_unit?: string | null;
          category?: string | null;
          company_id?: string;
          concentration?: string | null;
          created_at?: string | null;
          ean?: string | null;
          entry_unit?: string | null;
          external_code?: string;
          extra_data?: Json | null;
          first_import_batch_id?: string | null;
          id?: string;
          is_active?: boolean | null;
          last_import_batch_id?: string | null;
          manufacturer_code?: string | null;
          manufacturer_name?: string | null;
          presentation?: string | null;
          product_name?: string;
          quantity?: number | null;
          source_id?: string;
          subcategory?: string | null;
          tiss?: string | null;
          tuss?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ref_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'ref_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'ref_item_first_import_batch_id_fkey';
            columns: ['first_import_batch_id'];
            isOneToOne: false;
            referencedRelation: 'ref_import_batch';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_item_last_import_batch_id_fkey';
            columns: ['last_import_batch_id'];
            isOneToOne: false;
            referencedRelation: 'ref_import_batch';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_item_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'ref_source';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_item_source_id_fkey';
            columns: ['source_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_source_stats';
            referencedColumns: ['source_id'];
          },
        ];
      };
      ref_price_history: {
        Row: {
          created_at: string | null;
          currency: string | null;
          id: string;
          import_batch_id: string;
          item_id: string;
          price_meta: Json | null;
          price_type: string;
          price_value: number;
          valid_from: string;
        };
        Insert: {
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          import_batch_id: string;
          item_id: string;
          price_meta?: Json | null;
          price_type: string;
          price_value: number;
          valid_from: string;
        };
        Update: {
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          import_batch_id?: string;
          item_id?: string;
          price_meta?: Json | null;
          price_type?: string;
          price_value?: number;
          valid_from?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ref_price_history_import_batch_id_fkey';
            columns: ['import_batch_id'];
            isOneToOne: false;
            referencedRelation: 'ref_import_batch';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_price_history_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'ref_item';
            referencedColumns: ['id'];
          },
        ];
      };
      ref_source: {
        Row: {
          code: string;
          config: Json | null;
          created_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean | null;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          code: string;
          config?: Json | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          code?: string;
          config?: Json | null;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean | null;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      stock_balance: {
        Row: {
          avg_cost: number;
          company_id: string;
          id: string;
          location_id: string;
          product_id: string;
          qty_on_hand: number;
          updated_at: string | null;
        };
        Insert: {
          avg_cost?: number;
          company_id: string;
          id?: string;
          location_id: string;
          product_id: string;
          qty_on_hand?: number;
          updated_at?: string | null;
        };
        Update: {
          avg_cost?: number;
          company_id?: string;
          id?: string;
          location_id?: string;
          product_id?: string;
          qty_on_hand?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_balance_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_balance_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_balance_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_balance_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'stock_location';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_balance_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_batch: {
        Row: {
          batch_number: string;
          company_id: string;
          created_at: string | null;
          expiration_date: string | null;
          id: string;
          location_id: string;
          manufacture_date: string | null;
          nfe_import_id: string | null;
          notes: string | null;
          presentation_id: string | null;
          product_id: string;
          qty_on_hand: number;
          supplier_id: string | null;
          supplier_name: string | null;
          unit_cost: number | null;
          updated_at: string | null;
        };
        Insert: {
          batch_number: string;
          company_id: string;
          created_at?: string | null;
          expiration_date?: string | null;
          id?: string;
          location_id: string;
          manufacture_date?: string | null;
          nfe_import_id?: string | null;
          notes?: string | null;
          presentation_id?: string | null;
          product_id: string;
          qty_on_hand?: number;
          supplier_id?: string | null;
          supplier_name?: string | null;
          unit_cost?: number | null;
          updated_at?: string | null;
        };
        Update: {
          batch_number?: string;
          company_id?: string;
          created_at?: string | null;
          expiration_date?: string | null;
          id?: string;
          location_id?: string;
          manufacture_date?: string | null;
          nfe_import_id?: string | null;
          notes?: string | null;
          presentation_id?: string | null;
          product_id?: string;
          qty_on_hand?: number;
          supplier_id?: string | null;
          supplier_name?: string | null;
          unit_cost?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_batch_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'stock_location';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_batch_nfe_import_id_fkey';
            columns: ['nfe_import_id'];
            isOneToOne: false;
            referencedRelation: 'nfe_import';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_batch_presentation_id_fkey';
            columns: ['presentation_id'];
            isOneToOne: false;
            referencedRelation: 'product_presentation';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_batch_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_batch_supplier_id_fkey';
            columns: ['supplier_id'];
            isOneToOne: false;
            referencedRelation: 'supplier';
            referencedColumns: ['id'];
          },
        ];
      };
      stock_location: {
        Row: {
          active: boolean | null;
          company_id: string;
          created_at: string | null;
          id: string;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          company_id: string;
          created_at?: string | null;
          id?: string;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          company_id?: string;
          created_at?: string | null;
          id?: string;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_location_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_location_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_location_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      stock_movement: {
        Row: {
          batch_id: string | null;
          company_id: string;
          created_at: string | null;
          id: string;
          location_id: string;
          movement_type: string;
          notes: string | null;
          occurred_at: string | null;
          presentation_id: string | null;
          presentation_qty: number | null;
          product_id: string;
          qty: number;
          reference_id: string | null;
          reference_type: string | null;
          total_cost: number | null;
          unit_cost: number | null;
        };
        Insert: {
          batch_id?: string | null;
          company_id: string;
          created_at?: string | null;
          id?: string;
          location_id: string;
          movement_type: string;
          notes?: string | null;
          occurred_at?: string | null;
          presentation_id?: string | null;
          presentation_qty?: number | null;
          product_id: string;
          qty: number;
          reference_id?: string | null;
          reference_type?: string | null;
          total_cost?: number | null;
          unit_cost?: number | null;
        };
        Update: {
          batch_id?: string | null;
          company_id?: string;
          created_at?: string | null;
          id?: string;
          location_id?: string;
          movement_type?: string;
          notes?: string | null;
          occurred_at?: string | null;
          presentation_id?: string | null;
          presentation_qty?: number | null;
          product_id?: string;
          qty?: number;
          reference_id?: string | null;
          reference_type?: string | null;
          total_cost?: number | null;
          unit_cost?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_movement_batch_id_fkey';
            columns: ['batch_id'];
            isOneToOne: false;
            referencedRelation: 'stock_batch';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movement_batch_id_fkey';
            columns: ['batch_id'];
            isOneToOne: false;
            referencedRelation: 'vw_stock_with_batches';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movement_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movement_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_movement_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_movement_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'stock_location';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movement_presentation_id_fkey';
            columns: ['presentation_id'];
            isOneToOne: false;
            referencedRelation: 'product_presentation';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_movement_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
        ];
      };
      supplier: {
        Row: {
          active: boolean | null;
          address: string | null;
          city: string | null;
          code: string | null;
          company_id: string;
          contact_name: string | null;
          contact_phone: string | null;
          created_at: string | null;
          document: string | null;
          email: string | null;
          id: string;
          municipal_registration: string | null;
          name: string;
          notes: string | null;
          payment_terms: string | null;
          phone: string | null;
          state: string | null;
          state_registration: string | null;
          trade_name: string | null;
          updated_at: string | null;
          website: string | null;
          zip_code: string | null;
        };
        Insert: {
          active?: boolean | null;
          address?: string | null;
          city?: string | null;
          code?: string | null;
          company_id: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          municipal_registration?: string | null;
          name: string;
          notes?: string | null;
          payment_terms?: string | null;
          phone?: string | null;
          state?: string | null;
          state_registration?: string | null;
          trade_name?: string | null;
          updated_at?: string | null;
          website?: string | null;
          zip_code?: string | null;
        };
        Update: {
          active?: boolean | null;
          address?: string | null;
          city?: string | null;
          code?: string | null;
          company_id?: string;
          contact_name?: string | null;
          contact_phone?: string | null;
          created_at?: string | null;
          document?: string | null;
          email?: string | null;
          id?: string;
          municipal_registration?: string | null;
          name?: string;
          notes?: string | null;
          payment_terms?: string | null;
          phone?: string | null;
          state?: string | null;
          state_registration?: string | null;
          trade_name?: string | null;
          updated_at?: string | null;
          website?: string | null;
          zip_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'supplier_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'supplier_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'supplier_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      system_module: {
        Row: {
          active: boolean | null;
          code: string;
          description: string | null;
          display_order: number | null;
          icon: string | null;
          id: string;
          name: string;
        };
        Insert: {
          active?: boolean | null;
          code: string;
          description?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: string;
          name: string;
        };
        Update: {
          active?: boolean | null;
          code?: string;
          description?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: string;
          name?: string;
        };
        Relationships: [];
      };
      unit_of_measure: {
        Row: {
          active: boolean | null;
          allowed_scopes: Database['public']['Enums']['enum_unit_scope'][];
          code: string;
          company_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          name: string;
          symbol: string;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          allowed_scopes: Database['public']['Enums']['enum_unit_scope'][];
          code: string;
          company_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          symbol: string;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          allowed_scopes?: Database['public']['Enums']['enum_unit_scope'][];
          code?: string;
          company_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          symbol?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'unit_of_measure_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'unit_of_measure_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'unit_of_measure_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      user_action_logs: {
        Row: {
          action: string;
          company_id: string;
          created_at: string;
          entity: string;
          entity_id: string | null;
          entity_name: string | null;
          id: string;
          ip_address: unknown;
          new_data: Json | null;
          old_data: Json | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          company_id: string;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          entity_name?: string | null;
          id?: string;
          ip_address?: unknown;
          new_data?: Json | null;
          old_data?: Json | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          company_id?: string;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          entity_name?: string | null;
          id?: string;
          ip_address?: unknown;
          new_data?: Json | null;
          old_data?: Json | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_action_logs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_action_logs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'user_action_logs_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'user_action_logs_user_id_app_user_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'app_user';
            referencedColumns: ['auth_user_id'];
          },
        ];
      };
    };
    Views: {
      mv_known_products_ref: {
        Row: {
          brasindice_code: string | null;
          brasindice_item_id: string | null;
          cmed_item_id: string | null;
          cnpj: string | null;
          company_id: string | null;
          concentration: string | null;
          ean: string | null;
          ggrem_code: string | null;
          last_refresh: string | null;
          manufacturer: string | null;
          name: string | null;
          quantity: number | null;
          simpro_code: string | null;
          simpro_item_id: string | null;
          substance: string | null;
          tiss: string | null;
          tuss: string | null;
          unit: string | null;
        };
        Relationships: [];
      };
      mv_known_products_ref_prices: {
        Row: {
          company_id: string | null;
          ean: string | null;
          last_refresh: string | null;
          pf: number | null;
          pf_label: string | null;
          pmc: number | null;
          pmc_label: string | null;
          price_date: string | null;
          source: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ref_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'ref_item_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
        ];
      };
      vw_low_stock: {
        Row: {
          avg_cost: number | null;
          company_id: string | null;
          deficit: number | null;
          id: string | null;
          location_id: string | null;
          location_name: string | null;
          min_stock: number | null;
          product_id: string | null;
          product_name: string | null;
          qty_on_hand: number | null;
          unit: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_balance_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_balance_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_balance_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_balance_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'stock_location';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_balance_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
        ];
      };
      vw_ref_item_current_price: {
        Row: {
          created_at: string | null;
          currency: string | null;
          import_batch_id: string | null;
          item_id: string | null;
          price_id: string | null;
          price_meta: Json | null;
          price_type: string | null;
          price_value: number | null;
          valid_from: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'ref_price_history_import_batch_id_fkey';
            columns: ['import_batch_id'];
            isOneToOne: false;
            referencedRelation: 'ref_import_batch';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ref_price_history_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'ref_item';
            referencedColumns: ['id'];
          },
        ];
      };
      vw_ref_item_unified: {
        Row: {
          brasindice_code: string | null;
          brasindice_item_id: string | null;
          cmed_item_id: string | null;
          cnpj: string | null;
          company_id: string | null;
          concentration: string | null;
          ean: string | null;
          ggrem_code: string | null;
          manufacturer: string | null;
          name: string | null;
          quantity: number | null;
          simpro_code: string | null;
          simpro_item_id: string | null;
          substance: string | null;
          tiss: string | null;
          tuss: string | null;
          unit: string | null;
        };
        Relationships: [];
      };
      vw_ref_source_stats: {
        Row: {
          active_items_count: number | null;
          code: string | null;
          is_active: boolean | null;
          last_batch_id: string | null;
          last_batch_status: string | null;
          last_success_at: string | null;
          name: string | null;
          source_id: string | null;
          total_imports: number | null;
        };
        Insert: {
          active_items_count?: never;
          code?: string | null;
          is_active?: boolean | null;
          last_batch_id?: never;
          last_batch_status?: never;
          last_success_at?: never;
          name?: string | null;
          source_id?: string | null;
          total_imports?: never;
        };
        Update: {
          active_items_count?: never;
          code?: string | null;
          is_active?: boolean | null;
          last_batch_id?: never;
          last_batch_status?: never;
          last_success_at?: never;
          name?: string | null;
          source_id?: string | null;
          total_imports?: never;
        };
        Relationships: [];
      };
      vw_stock_with_batches: {
        Row: {
          active_ingredient_name: string | null;
          base_unit: string | null;
          batch_number: string | null;
          batch_status: string | null;
          company_id: string | null;
          concentration: string | null;
          days_until_expiration: number | null;
          expiration_date: string | null;
          id: string | null;
          item_type: string | null;
          location_id: string | null;
          location_name: string | null;
          manufacture_date: string | null;
          product_id: string | null;
          product_name: string | null;
          qty_on_hand: number | null;
          supplier_name: string | null;
          unit_cost: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'stock_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'company';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'mv_known_products_ref';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_batch_company_id_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'vw_ref_item_unified';
            referencedColumns: ['company_id'];
          },
          {
            foreignKeyName: 'stock_batch_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'stock_location';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_batch_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'product';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      get_paired_manufacturers: {
        Args: { p_company_id: string };
        Returns: {
          brasindice_codigo: string;
          cnpj: string;
          nome_fantasia: string;
          razao_social: string;
        }[];
      };
      get_user_company_id: { Args: never; Returns: string };
      get_user_permissions: {
        Args: { p_auth_user_id: string };
        Returns: {
          module_code: string;
          module_name: string;
          permission_code: string;
          permission_name: string;
        }[];
      };
      has_permission: {
        Args: {
          p_auth_user_id: string;
          p_module_code: string;
          p_permission_code: string;
        };
        Returns: boolean;
      };
      is_user_admin: { Args: never; Returns: boolean };
      log_user_action: {
        Args: {
          p_action: string;
          p_company_id: string;
          p_entity: string;
          p_entity_id?: string;
          p_entity_name?: string;
          p_new_data?: Json;
          p_old_data?: Json;
        };
        Returns: string;
      };
      refresh_known_products_ref_prices_view: {
        Args: never;
        Returns: undefined;
      };
      refresh_known_products_ref_view: { Args: never; Returns: undefined };
      unaccent: { Args: { '': string }; Returns: string };
    };
    Enums: {
      client_contact_type: 'phone' | 'whatsapp' | 'email' | 'other';
      enum_company_unit_type: 'matriz' | 'filial';
      enum_prescription_frequency_mode: 'every' | 'times_per' | 'shift';
      enum_prescription_item_supplier: 'company' | 'family' | 'government' | 'other';
      enum_prescription_item_type: 'medication' | 'material' | 'diet' | 'procedure' | 'equipment';
      enum_prescription_times_unit: 'day' | 'week' | 'month' | 'hour';
      enum_prescription_type: 'medical' | 'nursing' | 'nutrition';
      enum_unit_scope:
        | 'medication_base'
        | 'medication_prescription'
        | 'material_base'
        | 'material_prescription'
        | 'diet_base'
        | 'diet_prescription'
        | 'prescription_frequency'
        | 'procedure'
        | 'equipment'
        | 'scale';
      gender_type: 'male' | 'female' | 'other';
      patient_address_type: 'home' | 'billing' | 'service' | 'other';
      patient_contact_type: 'phone' | 'whatsapp' | 'email' | 'other';
      patient_identifier_type: 'cns' | 'prontuario' | 'operadora' | 'externo' | 'other';
      procedure_category: 'visit' | 'care' | 'therapy' | 'administration' | 'evaluation';
      race_type: 'white' | 'black' | 'brown' | 'yellow' | 'indigenous' | 'not_informed';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Type exports for convenience
export type Prescription = Tables<'prescription'>;
export type PrescriptionItem = Tables<'prescription_item'>;
export type PrescriptionItemComponent = Tables<'prescription_item_component'>;
export type ActiveIngredient = Tables<'active_ingredient'>;
export type Client = Tables<'client'>;
export type ClientContact = Tables<'client_contact'>;
export type Product = Tables<'product'>;
export type ProductPresentation = Tables<'product_presentation'>;
export type Equipment = Tables<'equipment'>;
export type Procedure = Tables<'procedure'>;
export type Company = Tables<'company'>;
export type Patient = Tables<'patient'>;
export type PatientAddress = Tables<'patient_address'>;
export type PatientContact = Tables<'patient_contact'>;
export type PatientPayer = Tables<'patient_payer'>;
export type Professional = Tables<'professional'>;
export type AppUser = Tables<'app_user'>;

export interface SystemUser {
  auth_user_id: string;
  is_superadmin: boolean;
  name: string;
  email: string;
  created_at: string;
}
export type Manufacturer = Tables<'manufacturer'>;
export type Supplier = Tables<'supplier'>;
export type NfeImport = Tables<'nfe_import'>;
export type NfeImportItem = Tables<'nfe_import_item'>;
export type RefSource = Tables<'ref_source'>;
export type RefImportBatch = Tables<'ref_import_batch'>;
export type RefImportError = Tables<'ref_import_error'>;
export type RefItem = Tables<'ref_item'>;
export type RefPriceHistory = Tables<'ref_price_history'>;
export type RefItemUnified = Tables<'vw_ref_item_unified'> & {
  last_refresh?: string | null;
  cmed_pf?: number | null;
  cmed_pf_label?: string | null;
  cmed_pf_date?: string | null;
  cmed_pmc?: number | null;
  cmed_pmc_label?: string | null;
  brasindice_pf?: number | null;
  brasindice_pf_label?: string | null;
  brasindice_pf_date?: string | null;
  brasindice_pmc?: number | null;
  brasindice_pmc_label?: string | null;
  simpro_pf?: number | null;
  simpro_pf_label?: string | null;
  simpro_pf_date?: string | null;
  simpro_pmc?: number | null;
  simpro_pmc_label?: string | null;
  best_pf?: number | null;
  best_pf_label?: string | null;
  best_pmc?: number | null;
  best_pmc_label?: string | null;
  price_source?: string | null;
  price_date?: string | null;
};
export type StockLocation = Tables<'stock_location'>;
export type StockBalance = Tables<'stock_balance'>;
export type StockMovement = Tables<'stock_movement'>;
export type StockBatch = Tables<'stock_batch'>;

// Type aliases
export type PrescriptionType = 'medical' | 'nursing' | 'nutrition';
export type PrescriptionItemSupplier = 'company' | 'family' | 'government' | 'other';
export type ClientContactType = Enums<'client_contact_type'>;
export type PatientAddressType = Enums<'patient_address_type'>;
export type PatientContactType = Enums<'patient_contact_type'>;
export type GenderType = Enums<'gender_type'>;

export type InsertTables<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = TablesInsert<DefaultSchemaTableNameOrOptions, TableName>;

export type UpdateTables<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = TablesUpdate<DefaultSchemaTableNameOrOptions, TableName>;

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      client_contact_type: ['phone', 'whatsapp', 'email', 'other'],
      enum_company_unit_type: ['matriz', 'filial'],
      enum_prescription_frequency_mode: ['every', 'times_per', 'shift'],
      enum_prescription_item_supplier: ['company', 'family', 'government', 'other'],
      enum_prescription_item_type: ['medication', 'material', 'diet', 'procedure', 'equipment'],
      enum_prescription_times_unit: ['day', 'week', 'month', 'hour'],
      enum_prescription_type: ['medical', 'nursing', 'nutrition'],
      enum_unit_scope: [
        'medication_base',
        'medication_prescription',
        'material_base',
        'material_prescription',
        'diet_base',
        'diet_prescription',
        'prescription_frequency',
        'procedure',
        'equipment',
        'scale',
      ],
      gender_type: ['male', 'female', 'other'],
      patient_address_type: ['home', 'billing', 'service', 'other'],
      patient_contact_type: ['phone', 'whatsapp', 'email', 'other'],
      patient_identifier_type: ['cns', 'prontuario', 'operadora', 'externo', 'other'],
      procedure_category: ['visit', 'care', 'therapy', 'administration', 'evaluation'],
      race_type: ['white', 'black', 'brown', 'yellow', 'indigenous', 'not_informed'],
    },
  },
} as const;
