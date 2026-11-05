import React, { useState, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/Dialog';
import Button from '../ui/Button';
import { Sparkles as SparklesIcon, Download as DownloadIcon } from 'lucide-react'; // Import directly from lucide-react
import { Machine } from '@/types';
import { MachineMonthlyStat, MonthlyDistributionResult } from '@/types/monthly-stats';
import { calculateMonthlyDistribution } from '@/utils/distribution-algo';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    month: string;
    machines: Machine[];
    monthlyStats: MachineMonthlyStat[];
    globalSettings: { intemperieDays: string[] };
}

export const SynthesisReportModal: React.FC<Props> = ({ isOpen, onClose, month, machines, monthlyStats, globalSettings }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && !report) {
            generateReport();
        }
    }, [isOpen]);

    const generateReport = async () => {
        setLoading(true);
        setError(null);
        try {
            const ai = new GoogleGenerativeAI(
                process.env.NEXT_PUBLIC_GOOGLE_AI_API_KEY ||
                process.env.GOOGLE_AI_API_KEY ||
                ""
            );
            const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

            // Build Prompt
            const periodData = machines.map(m => {
                const stat = monthlyStats.find(s => s.machineId === m.id);
                if (!stat) return null;
                const dist = calculateMonthlyDistribution(stat, { intemperieDays: globalSettings.intemperieDays, forcedWorkDays: [] });
                return {
                    code: m.code,
                    designation: m.designation,
                    work: dist.totalWorkHours,
                    overtime: dist.totalOvertimeHours,
                    idle: dist.totalIdleHours,
                    breakdown: dist.totalBreakdownHours
                };
            }).filter(Boolean);

            if (periodData.length === 0) {
                setReport("Aucune donnée disponible pour ce mois.");
                setLoading(false);
                return;
            }

            const prompt = `
        Tu es un expert en gestion de parc engins (Fleet Manager).
        Analyse les données mensuelles suivantes pour le mois de ${month} :
        
        ${periodData.map((d: any) => `- ${d.code} (${d.designation}): Travail=${d.work.toFixed(1)}h, Sup=${d.overtime.toFixed(1)}h, Chômage=${d.idle.toFixed(1)}h, Panne=${d.breakdown.toFixed(1)}h`).join('\n')}
        
        Rédige un rapport de synthèse "Elite" et professionnel en Français.
        Structure:
        1. **Performance Globale**: Résumé de l'activité du parc.
        2. **Points Critiques**: Machines en panne excessive ou sous-utilisées (Chômage élevé).
        3. **Recommandations**: Actions à entreprendre.
        
        Sois concis, direct et utilise des puces pour la lisibilité.
      `;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            setReport(response.text());
        } catch (err: any) {
            console.error(err);
            setError("Erreur lors de la génération du rapport : " + (err.message || 'Inconnue'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-indigo-500" />
                    Synthèse IA Mensuelle
                </DialogTitle>
                <DialogDescription>Analyse générée par Gemini Pro basée sur les compteurs et pannes du mois.</DialogDescription>
            </DialogHeader>

            <DialogContent className="max-w-2xl">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4">
                        <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                        <p className="text-sm text-muted-foreground animate-pulse">Analyse des données en cours...</p>
                    </div>
                ) : error ? (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
                        {error}
                        <Button size="sm" variant="outline" onClick={generateReport} className="mt-2 w-full border-destructive/20 hover:bg-destructive/20">Réessayer</Button>
                    </div>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-h-[60vh] overflow-y-auto p-2 bg-muted/30 rounded-lg border border-border/50">
                        <div className="whitespace-pre-wrap">{report}</div>
                    </div>
                )}
            </DialogContent>

            <DialogFooter>
                <Button variant="outline" onClick={onClose}>Fermer</Button>
                {report && (
                    <Button className="gap-2" onClick={() => {
                        // Simple copy to clipboard or print
                        navigator.clipboard.writeText(report);
                        // Or could implement PDF export later
                    }}>
                        Copier le rapport
                    </Button>
                )}
            </DialogFooter>
        </Dialog>
    );
};
