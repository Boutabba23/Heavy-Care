import { MachineMonthlyStat, DailyDistribution, MonthlyDistributionResult } from "../types/monthly-stats";

interface DistributionConfig {
    intemperieDays: string[]; // Global bad weather days
    forcedWorkDays: string[]; // Specific days capable of working even if weekend (optional future proofing)
}

export const calculatePeriodDates = (monthStr: string): { start: Date; end: Date; allDates: Date[] } => {
    // Month string format: "YYYY-MM"
    // Period: 21st of previous month to 20th of selected month
    const [year, month] = monthStr.split('-').map(Number);

    // Create dates. Note: month is 1-indexed in our string, but Date constructor uses 0-index months.
    // Previous month 21st
    const startDate = new Date(year, month - 2, 21);
    // Current month 20th
    const endDate = new Date(year, month - 1, 20);

    const allDates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
        allDates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }

    return { start: startDate, end: endDate, allDates };
};

export const calculateMonthlyDistribution = (
    stat: MachineMonthlyStat,
    config: DistributionConfig = { intemperieDays: [], forcedWorkDays: [] }
): MonthlyDistributionResult => {
    const { allDates } = calculatePeriodDates(stat.month);

    const totalActiveHours = stat.endHours - stat.startHours;

    // 1. Identify Day Types and breakdown hours
    const dayCalculations = allDates.map(date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat

        let status: 'WORK' | 'WEEKEND' | 'PANNE' | 'INTEMPERIE' | 'CHOMAGE' = 'WORK';
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

        if (stat.breakdownDays.includes(dateStr)) {
            status = 'PANNE';
        } else if (config.intemperieDays.includes(dateStr)) {
            status = 'INTEMPERIE';
        } else if (stat.idleDays?.includes(dateStr)) {
            status = 'CHOMAGE';
        } else if (isWeekend && !stat.worksOnWeekends) {
            status = 'WEEKEND';
        }

        const bdHours = (status === 'PANNE' && stat.breakdownHours && stat.breakdownHours[dateStr] !== undefined)
            ? stat.breakdownHours[dateStr]
            : (status === 'PANNE' ? 8 : 0);

        return {
            date: dateStr,
            status,
            isWeekend,
            breakdownHours: bdHours
        };
    });

    // 2. Calculate Thresholds
    const totalBreakdownHours = dayCalculations.reduce((acc, d) => acc + d.breakdownHours, 0);
    const potentialDays = dayCalculations.filter(d => d.status === 'WORK' || d.status === 'CHOMAGE' || d.status === 'PANNE');
    const potentialTotal = potentialDays.length * 8;

    const hoursToDistribute = Math.max(0, totalActiveHours);

    // 3. Distribute to available days (WORK, CHOMAGE, PANNE)
    const distributionDays = dayCalculations.filter(d => d.status === 'WORK' || d.status === 'CHOMAGE' || d.status === 'PANNE');
    const numDistDays = distributionDays.length;
    const baseHoursPerDay = numDistDays > 0 ? Math.floor(hoursToDistribute / numDistDays) : 0;
    const extraHoursRemainder = numDistDays > 0 ? hoursToDistribute % numDistDays : 0;

    // Randomize which days get the extra +1 hour
    const extraHourDates = new Set<string>();
    if (extraHoursRemainder > 0 && numDistDays > 0) {
        const availableDates = distributionDays.map(d => d.date);
        // Fisher-Yates shuffle
        for (let i = availableDates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableDates[i], availableDates[j]] = [availableDates[j], availableDates[i]];
        }
        // Pick the first N dates
        availableDates.slice(0, extraHoursRemainder).forEach(date => extraHourDates.add(date));
    }

    const days: DailyDistribution[] = dayCalculations.map(d => {
        if (d.status === 'INTEMPERIE') {
            return {
                date: d.date,
                status: 'INTEMPERIE',
                workHours: 0,
                overtimeHours: 0,
                idleHours: 0,
                breakdownHours: 0,
                intemperieHours: 8
            };
        } else if (d.status === 'WEEKEND') {
            return {
                date: d.date,
                status: 'WEEKEND',
                workHours: 0,
                overtimeHours: 0,
                idleHours: 0,
                breakdownHours: 0,
                intemperieHours: 0
            };
        } else {
            // WORK, CHOMAGE, or PANNE
            const dayTotalHours = baseHoursPerDay + (extraHourDates.has(d.date) ? 1 : 0);

            const capacityForStandardWork = Math.max(0, 8 - d.breakdownHours);
            const work = Math.min(capacityForStandardWork, dayTotalHours);
            const overtime = Math.max(0, dayTotalHours - capacityForStandardWork);
            const idle = Math.max(0, capacityForStandardWork - work);

            return {
                date: d.date,
                status: d.status,
                workHours: work,
                overtimeHours: overtime,
                idleHours: idle,
                breakdownHours: d.breakdownHours,
                intemperieHours: 0
            };
        }
    });

    // Calculate Totals
    const totalWork = days.reduce((acc, d) => acc + d.workHours, 0);
    const totalOvertime = days.reduce((acc, d) => acc + d.overtimeHours, 0);
    const totalIdle = days.reduce((acc, d) => acc + d.idleHours, 0);
    const totalBreakdown = days.reduce((acc, d) => acc + d.breakdownHours, 0);
    const totalIntemperie = days.reduce((acc, d) => acc + d.intemperieHours, 0);

    return {
        days,
        totalActiveHours,
        totalWorkHours: totalWork,
        totalOvertimeHours: totalOvertime,
        totalIdleHours: totalIdle,
        totalBreakdownHours: totalBreakdown,
        totalIntemperieHours: totalIntemperie
    };
};
