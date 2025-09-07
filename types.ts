export enum View {
  DASHBOARD = "DASHBOARD",
  MACHINE_LIST = "MACHINE_LIST",
  MACHINE_DETAIL = "MACHINE_DETAIL",
  FILTER_MANAGEMENT = "FILTER_MANAGEMENT",
  MAINTENANCE = "MAINTENANCE",
  SETTINGS = "SETTINGS",
  ANALYTICS = "ANALYTICS",
  USER_PROFILE = "USER_PROFILE",
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
}

export interface FilterType {
  id: string;
  name: string; // e.g., "Filtre à huile", "Filtre à air cabine"
}

export interface AssignedFilter {
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
}

export interface UsedFilter {
  filterTypeId: string;
  referenceId: string;
  quantity: number;
}

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  maintenanceRange: "C" | "D" | "E" | "F";
  serviceHours: number;
  date: string; // ISO String
  filtersUsed: UsedFilter[];
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
}
