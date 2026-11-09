export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      machines: {
        Row: {
          id: string
          code: string
          designation: string
          marque: string
          type: string
          serial_number: string | null
          registration_number: string | null
          service_hours: number
          assigned_filters: Json
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          designation: string
          marque: string
          type: string
          serial_number?: string | null
          registration_number?: string | null
          service_hours?: number
          assigned_filters?: Json
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          designation?: string
          marque?: string
          type?: string
          serial_number?: string | null
          registration_number?: string | null
          service_hours?: number
          assigned_filters?: Json
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      filter_types: {
        Row: {
          id: string
          name: string
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      filter_groups: {
        Row: {
          id: string
          name: string
          filter_type: string | null
          original_reference_id: string | null
          references: Json
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          filter_type?: string | null
          original_reference_id?: string | null
          references?: Json
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          filter_type?: string | null
          original_reference_id?: string | null
          references?: Json
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      maintenance_records: {
        Row: {
          id: string
          machine_id: string | null
          date: string
          service_hours: number
          maintenance_range: string
          filters_used: Json
          oils_used: Json | null
          downtime_hours: number
          panne_hours: number
          chantier_id: string | null
          pole_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          machine_id?: string | null
          date: string
          service_hours?: number
          maintenance_range?: string
          filters_used?: Json
          oils_used?: Json | null
          downtime_hours?: number
          panne_hours?: number
          chantier_id?: string | null
          pole_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          machine_id?: string
          date?: string
          service_hours?: number
          maintenance_range?: string
          filters_used?: Json
          oils_used?: Json | null
          downtime_hours?: number
          panne_hours?: number
          chantier_id?: string | null
          pole_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      monthly_daily_adjustments: {
        Row: {
          id: string
          machine_id: string
          date: string
          downtime_hours: number
          panne_hours: number
          notes: string | null
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          machine_id: string
          date: string
          downtime_hours?: number
          panne_hours?: number
          notes?: string | null
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          machine_id?: string
          date?: string
          downtime_hours?: number
          panne_hours?: number
          notes?: string | null
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      oil_stocks: {
        Row: {
          id: string
          type: string
          current_level: number
          total_barrels: number
          alert_threshold: number
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          current_level?: number
          total_barrels?: number
          alert_threshold?: number
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          current_level?: number
          total_barrels?: number
          alert_threshold?: number
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      spare_parts: {
        Row: {
          id: string
          reference: string
          designation: string
          serial_number: string | null
          category: string | null
          manufacturer: string | null
          unitPrice: number
          stockQuantity: number
          minStock: number
          location: string | null
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          reference: string
          designation: string
          serial_number?: string | null
          category?: string | null
          manufacturer?: string | null
          unitPrice: number
          stockQuantity: number
          minStock: number
          location?: string | null
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          reference?: string
          designation?: string
          serial_number?: string | null
          category?: string | null
          manufacturer?: string | null
          unitPrice?: number
          stockQuantity?: number
          minStock?: number
          location?: string | null
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      spare_part_installations: {
        Row: {
          id: string
          spare_part_id: string | null
          machine_id: string | null
          quantity: number
          installation_date: string
          service_hours_at_install: number | null
          installed_by: string | null
          notes: string | null
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          spare_part_id?: string | null
          machine_id?: string | null
          quantity: number
          installation_date: string
          service_hours_at_install?: number | null
          installed_by?: string | null
          notes?: string | null
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          spare_part_id?: string | null
          machine_id?: string | null
          quantity?: number
          installation_date?: string
          service_hours_at_install?: number | null
          installed_by?: string | null
          notes?: string | null
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      global_monthly_settings: {
        Row: {
          id: string
          month: string
          intemperie_days: string[]
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          month: string
          intemperie_days?: string[]
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          month?: string
          intemperie_days?: string[]
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      machine_monthly_stats: {
        Row: {
          id: string
          machine_id: string
          month: string
          start_hours: number
          end_hours: number
          works_on_weekends: boolean
          breakdown_days: string[]
          breakdown_hours: Record<string, number>
          idle_days: string[]
          idle_hours: Record<string, number>
          chantier_id: string | null
          pole_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          machine_id: string
          month: string
          start_hours?: number
          end_hours?: number
          works_on_weekends?: boolean
          breakdown_days?: string[]
          breakdown_hours?: Record<string, number>
          idle_days?: string[]
          idle_hours?: Record<string, number>
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          machine_id?: string
          month?: string
          start_hours?: number
          end_hours?: number
          works_on_weekends?: boolean
          breakdown_days?: string[]
          breakdown_hours?: Record<string, number>
          idle_days?: string[]
          idle_hours?: Record<string, number>
          chantier_id?: string | null
          pole_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      poles: {
        Row: {
          id: string
          name: string
          code: string
          created_at: string
          updated_at: string
          archived_at: string | null
          password_hash: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          password_hash?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          created_at?: string
          updated_at?: string
          archived_at?: string | null
          password_hash?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          pole_id: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          pole_id?: string | null
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          pole_id?: string | null
          role?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
