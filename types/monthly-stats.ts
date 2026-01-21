export interface MachineMonthlyStat {
    id: string;
    machineId: string;
    month: string; // YYYY-MM
    startHours: number;
    endHours: number;
    worksOnWeekends: boolean;
    breakdownDays: string[]; // ISO Date strings (YYYY-MM-DD)
    breakdownHours: Record<string, number>; // dateStr -> hour value
}

export interface DayStatus {
    date: string; // YYYY-MM-DD
    status: 'WORK' | 'WEEKEND' | 'PANNE' | 'INTEMPERIE';
    originalStatus?: 'WORK' | 'WEEKEND'; // To know if it was originally a weekend
}

export interface DailyDistribution {
    date: string;
    status: 'WORK' | 'WEEKEND' | 'PANNE' | 'INTEMPERIE';
    workHours: number;
    overtimeHours: number;
    idleHours: number; // Chômage
    breakdownHours: number; // Panne
    intemperieHours: number; // Intemperie
}

export interface MonthlyDistributionResult {
    days: DailyDistribution[];
    totalActiveHours: number;
    totalWorkHours: number;
    totalOvertimeHours: number;
    totalIdleHours: number;
    totalBreakdownHours: number;
    totalIntemperieHours: number;
}
