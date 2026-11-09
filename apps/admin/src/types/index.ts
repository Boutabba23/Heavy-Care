// Types for the Admin Application

export interface Pole {
  id: string;
  code: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  archived_at?: string | null;
  password_hash?: string | null;
}

export interface Profile {
  id: string;
  pole_id: string | null;
  role: 'super_admin' | 'pole_admin' | 'user';
  created_at?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'super_admin' | 'pole_admin' | 'user';
  pole: Pole | null;
  created_at?: string;
}

export interface PoleStats {
  pole_id: string;
  pole_code: string;
  pole_name: string;
  machine_count: number;
  maintenance_count: number;
  user_count: number;
}
