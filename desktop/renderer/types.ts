export enum View {
  LANDING = "LANDING",
  DASHBOARD = "DASHBOARD",
  MACHINE_LIST = "MACHINE_LIST",
  MACHINE_DETAIL = "MACHINE_DETAIL",
  FILTER_MANAGEMENT = "FILTER_MANAGEMENT",
  MAINTENANCE = "MAINTENANCE",
  SPARE_PARTS = "SPARE_PARTS",
  SETTINGS = "SETTINGS",
  ANALYTICS = "ANALYTICS",
  MONTHLY_SUMMARY = "MONTHLY_SUMMARY",
  USER_PROFILE = "USER_PROFILE",
  OIL_MANAGEMENT = "OIL_MANAGEMENT",
  POLE_ADMIN = "POLE_ADMIN",
}

export type Theme = string;

export interface CustomColors {
  background: string;
  foreground: string;
  foregroundSecondary: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  cardBorders: string[];
  backgroundImage?: string;
}

export interface SavedTheme {
  id: string;
  name: string;
  colors: CustomColors;
}

export interface FilterReference {
  id: string;
  reference: string;
  manufacturer: string;
  price: number;
  stock: number;
  image?: string; // base64 string
}

export interface FilterGroup {
  id: string;
  name: string;
  filterType: string; // The type of filter this group is for (e.g., "huile", "air", etc.)
  originalReferenceId?: string | null;
  references: FilterReference[];
  pole_id?: string | null;
  description?: string | null;
}

export interface FilterType {
  id: string;
  name: string; // e.g., "Filtre à huile", "Filtre à air cabine"
  pole_id?: string | null;
  filter_group_id?: string | null;
  part_number?: string | null;
}

export interface AssignedFilter {
  id: string; // unique instance id
  filterTypeId: string;
  filterGroupId: string | null; // Can be unassigned
}

export interface Machine {
  id: string;
  code: string;
  designation: string;
  marque: string;
  type: string;
  serialNumber?: string;
  registrationNumber?: string;
  serviceHours: number;
  assignedFilters: AssignedFilter[];
  pole_id?: string | null;
  status?: string;
}

export interface UsedFilter {
  filterTypeId: string;
  referenceId: string;
  quantity: number;
}

export interface UsedOil {
  oilStockId: string;
  quantity: number;
}

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  maintenanceRange: "C" | "D" | "E" | "F";
  serviceHours: number;
  date: string; // ISO String
  filtersUsed: UsedFilter[];
  oilsUsed: UsedOil[];
  downtimeHours?: number; // hours of idle time recorded for this maintenance
  panneHours?: number; // hours of breakdown recorded for this maintenance
}

export interface DailyAdjustment {
  id: string;
  machineId: string;
  date: string; // ISO date (YYYY-MM-DD)
  downtimeHours: number;
  panneHours: number;
  notes?: string;
}

// --- AI Assistant Types ---
export interface AISuggestion {
  referenceId: string;
  reference: string;
  manufacturer: string;
  groupId: string;
  groupName: string;
  reasoning: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "model";
  text?: string;
  image?: string; // base64 string
  suggestions?: AISuggestion[];
  sources?: GroundingSource[];
  isLoading?: boolean;
  isError?: boolean;
}

// --- Notification Types ---
export interface Notification {
  id: string; // e.g., 'maint-alert-m1-12930' or 'stock-alert-fr4'
  type: "maintenance" | "stock";
  message: string;
  read: boolean;
  entityId: string; // machineId for maintenance, filterGroupId for stock
  createdAt: string; // ISO string for sorting
}

// --- Toast Notifications ---
export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  description?: string;
}

// --- Stock Management ---
export interface StockUpdateInfo {
  filterReference: FilterReference;
  filterGroupId: string;
  isRemove?: boolean;
}

// --- Spare Parts Management ---
export interface SparePart {
  id: string;
  reference: string;
  designation: string;
  serialNumber?: string;
  category?: string;
  manufacturer?: string;
  unitPrice: number;
  stockQuantity: number;
  minStock: number;
  location?: string;
}

export interface SparePartInstallation {
  id: string;
  sparePartId: string;
  machineId: string;
  quantity: number;
  installationDate: string; // ISO date (YYYY-MM-DD)
  serviceHoursAtInstall?: number;
  installedBy?: string;
  notes?: string;
}

// --- Oil Management ---
export interface OilStock {
  id: string;
  type: string; // e.g., "15W40", "Hydraulique 46"
  currentLevel: number; // Liters in current barrel (max 200)
  totalBarrels: number; // Number of full barrels in stock
  alertThreshold: number; // Level to trigger low stock alert (e.g., 20L)
}

export interface OilTransaction {
  id: string;
  machineId: string;
  oilStockId: string;
  quantity: number;
  date: string;
  performedBy?: string;
  serviceHours?: number;
}

export * from './types/monthly-stats';

// --- Multi-pole / Multi-chantier types ---

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

export interface UserWithPole {
  id: string;
  email: string;
  role: 'super_admin' | 'pole_admin' | 'user';
  pole: Pole | null;
}

