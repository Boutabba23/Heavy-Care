// Centralized gamme (maintenance range) colors and utilities

export const rangeColors = {
  C: "bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-700",
  D: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  E: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  F: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700",
} as const;

export const rangeTooltips = {
  C: "Maintenance légère (250h) : Vidange moteur, remplacement filtre à huile.",
  D: "Maintenance intermédiaire (500h) : Inclut Gamme C + filtres à carburant.",
  E: "Maintenance moyenne (1000h) : Inclut Gamme D + filtres hydrauliques et à air.",
  F: "Maintenance majeure (2000h) : Inclut Gamme E + inspection complète et autres remplacements.",
} as const;

export type MaintenanceRange = keyof typeof rangeColors;

/**
 * Get the CSS classes for a maintenance range badge
 */
export const getRangeColorClasses = (range: MaintenanceRange): string => {
  return rangeColors[range];
};

/**
 * Get the tooltip text for a maintenance range
 */
export const getRangeTooltip = (range: MaintenanceRange): string => {
  return rangeTooltips[range];
};
