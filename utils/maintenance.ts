import { MaintenanceRecord, Machine } from '../types';

export const maintenanceSequence = ['C', 'D', 'C', 'E', 'C', 'D', 'C', 'F'];

export const calculateNextMaintenance = (
    machine: Machine,
    machineHistory: MaintenanceRecord[]
): { gamme: string; hours: number; dueIn: number } | null => {
    
    // Sort history by service hours to ensure chronological order of operations
    const sortedHistory = [...machineHistory].sort((a, b) => a.serviceHours - b.serviceHours);

    if (sortedHistory.length === 0) {
        // No history, this is the first maintenance cycle. Schedule it at the next 250h interval.
        const nextHours = Math.max(250, Math.ceil(machine.serviceHours / 250) * 250);
        const finalNextHours = nextHours <= machine.serviceHours ? nextHours + 250 : nextHours;
        return {
            gamme: maintenanceSequence[0],
            hours: finalNextHours,
            dueIn: finalNextHours - machine.serviceHours,
        };
    }

    const lastMaintenance = sortedHistory[sortedHistory.length - 1];

    // Determine the machine's correct position in the maintenance sequence by replaying its history.
    let sequencePointer = 0;
    for (const record of sortedHistory) {
        const performedGamme = record.maintenanceRange;
        let foundMatch = false;
        
        // Search forward from the current pointer to find the next matching maintenance type.
        // We search over two cycles (e.g., 16 elements) to correctly handle cases where the sequence wraps around.
        for (let i = sequencePointer; i < maintenanceSequence.length * 2; i++) {
            if (maintenanceSequence[i % maintenanceSequence.length] === performedGamme) {
                // We found the performed maintenance. The next one in the sequence is after this.
                sequencePointer = i + 1;
                foundMatch = true;
                break;
            }
        }
        
        // As a fallback, if a maintenance was logged that is so out of sequence it wasn't found
        // in the forward search, we reset the pointer to its first occurrence and sync from there.
        if (!foundMatch) {
            const firstOccurrenceIndex = maintenanceSequence.indexOf(performedGamme);
            if (firstOccurrenceIndex !== -1) {
                sequencePointer = firstOccurrenceIndex + 1;
            }
        }
    }

    // Now, `sequencePointer` points to the index for the *next* maintenance gamme.
    // The base for calculation is ALWAYS the hours of the last recorded maintenance.
    let nextHours = lastMaintenance.serviceHours;
    let nextSequenceIndex = sequencePointer;

    // Fast-forward past any overdue maintenance intervals to find the next one that is in the future.
    // This handles cases where a machine has run long past its scheduled maintenance.
    while (nextHours + 250 <= machine.serviceHours) {
        nextHours += 250;
        nextSequenceIndex++; // Also advance the gamme sequence for each skipped interval
    }
    
    // The final next maintenance is 250h after the last calculated point.
    nextHours += 250;

    const nextGamme = maintenanceSequence[nextSequenceIndex % maintenanceSequence.length];
    
    return {
        gamme: nextGamme,
        hours: nextHours,
        dueIn: nextHours - machine.serviceHours,
    };
};