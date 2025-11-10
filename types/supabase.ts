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
          created_at?: string
          updated_at?: string
        }
      }
      filter_types: {
        Row: {
          id: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          filter_type?: string | null
          original_reference_id?: string | null
          references?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          filter_type?: string | null
          original_reference_id?: string | null
          references?: Json
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
          maintenance_range: 'C' | 'D' | 'E' | 'F'
          filters_used: Json
          
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          machine_id?: string | null
          date: string
          service_hours: number
          maintenance_range: 'C' | 'D' | 'E' | 'F'
          filters_used?: Json
          
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          machine_id?: string | null
          date?: string
          service_hours?: number
          maintenance_range?: 'C' | 'D' | 'E' | 'F'
          filters_used?: Json
        
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
          created_at?: string
          updated_at?: string
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