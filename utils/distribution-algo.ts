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

    // 1. Identify Day Types
    const dayCalculations = allDates.map(date => {
        // Use local date part to avoid UTC shift issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat

        let status: 'WORK' | 'WEEKEND' | 'PANNE' | 'INTEMPERIE' = 'WORK';

        // Weekend is explicitly Friday (5) and Saturday (6) per user requirement
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;

        if (stat.breakdownDays.includes(dateStr)) {
            status = 'PANNE';
        } else if (config.intemperieDays.includes(dateStr)) {
            status = 'INTEMPERIE';
        } else if (isWeekend && !stat.worksOnWeekends) {
            status = 'WEEKEND';
        }

        return {
            date: dateStr,
            status,
            isWeekend
        };
    });

    // 2. Calculate Deductions (Panne = 8h)
    // Intemperie = 0h work, but explainable. 
    // We need to see if "Panne" consumes from the TotalActiveHours?
    // Logic from prompt: "Calculate total breakdown hours (8h per breakdown day)."
    // "HoursToDistribute = TotalActiveHours - TotalBreakdownHours."

    let totalBreakdownHours = 0;
    dayCalculations.forEach(d => {
        if (d.status === 'PANNE') {
            const hours = (stat.breakdownHours && stat.breakdownHours[d.date] !== undefined)
                ? stat.breakdownHours[d.date]
                : 8;
            totalBreakdownHours += hours;
        }
    });

    // Ensure we don't subtract more than we have (though typically counter increases include work, not downtime?)
    // Prompt says: "TotalActiveHours = currentCounter - prevCounter"
    // Then "HoursToDistribute = TotalActiveHours - TotalBreakdownHours"
    // This implies the counter DOES record breakdown time? Or maybe it's just a heuristic.
    // If the machine engine is OFF during breakdown, counter shouldn't move. 
    // But maybe this "TotalActiveHours" is actually "Total Time Passed"? 
    // No, "currentCounter - prevCounter" is definitely Engine Hours.
    // If the machine is broken, engine is off. So TotalActiveHours should purely be WORK hours.
    // HOWEVER, the prompt explicitly says: "HoursToDistribute = TotalActiveHours - TotalBreakdownHours".
    // This suggests the user treats the counter difference as a pool that *includes* the breakdown time? 
    // That's physically weird for an hour meter (hm). 
    // Let's follow the prompt's math strictly: 
    // "Math Logic: 1. Calculate total breakdown hours (8h per breakdown day). 2. HoursToDistribute = TotalActiveHours - TotalBreakdownHours."

    let hoursToDistribute = Math.max(0, totalActiveHours - totalBreakdownHours);

    // 3. Distribute evenly across valid WORK days
    /*
       "Distribute HoursToDistribute evenly across valid WORK days.
        Cap standard hours at 8h. Any excess goes to overtimeHours.
        If HoursToDistribute is low, fill days partially; remaining capacity becomes idleHours (Chômage)."
    */

    const workDays = dayCalculations.filter(d => d.status === 'WORK');
    const numWorkDays = workDays.length;

    let dailyBase = 0;
    let dailyOvertime = 0;
    let chomagePerDay = 0; // If hours are low

    if (numWorkDays > 0) {
        const avgHours = hoursToDistribute / numWorkDays;

        if (avgHours > 8) {
            dailyBase = 8;
            dailyOvertime = avgHours - 8;
            chomagePerDay = 0;
        } else {
            dailyBase = avgHours;
            dailyOvertime = 0;
            chomagePerDay = 8 - avgHours; // 8h capacity - actual work
        }
    }

    // 4. Construct Final Result
    const days: DailyDistribution[] = dayCalculations.map(d => {
        if (d.status === 'PANNE') {
            const hours = (stat.breakdownHours && stat.breakdownHours[d.date] !== undefined)
                ? stat.breakdownHours[d.date]
                : 8;
            return {
                date: d.date,
                status: 'PANNE',
                workHours: 0,
                overtimeHours: 0,
                idleHours: 0,
                breakdownHours: hours,
                intemperieHours: 0
            };
        } else if (d.status === 'INTEMPERIE') {
            // Intemperie is usually 8h lost? or just 0 work?
            // Assuming 0 work, 0 breakdown, just "Intemperie" state.
            // Often in construction, Intemperie counts as 8h "Intemperie".
            return {
                date: d.date,
                status: 'INTEMPERIE',
                workHours: 0,
                overtimeHours: 0,
                idleHours: 0,
                breakdownHours: 0,
                intemperieHours: 8 // Assuming 8h capacity lost
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
            // WORK
            return {
                date: d.date,
                status: 'WORK',
                workHours: dailyBase,
                overtimeHours: dailyOvertime,
                idleHours: chomagePerDay,
                breakdownHours: 0,
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
        totalActiveHours, // The input delta
        totalWorkHours: totalWork,
        totalOvertimeHours: totalOvertime,
        totalIdleHours: totalIdle,
        totalBreakdownHours: totalBreakdown,
        totalIntemperieHours: totalIntemperie
    };
};
