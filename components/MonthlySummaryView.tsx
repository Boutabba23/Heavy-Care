"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Machine, MaintenanceRecord } from "../types";
import {
	MachineMonthlyStat,
	MonthlyDistributionResult,
} from "../types/monthly-stats";
import {
	calculateMonthlyDistribution,
	calculatePeriodDates,
} from "../utils/distribution-algo";
import { supabase } from "../utils/supabase";
import { exportMonthlySynthesisToExcel } from "../utils/excel-export";

import { SynthesisReportModal } from "./MonthlyStats/SynthesisReportModal";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from "recharts";
import {
	BarChart3 as CalendarIcon, // Calendar unavailable, using BarChart3 as fallback
	Download,
	Sparkles,
	AlertTriangle as AlertTriangleLucide, // use lucide import if available
} from "lucide-react";
// Since previous checks failed, let's rely on constants.tsx where possible

import {
	ClockIcon,
	ExcavatorIcon,
	WrenchIcon,
	ExclamationTriangleIcon,
	SparklesIcon,
	MoonIcon, // for idle? or sun?
	CloudRainIcon,
	SearchIcon,
} from "../constants";

import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";
import {
	Table,
	TableHeader,
	TableBody,
	TableHead,
	TableRow,
	TableCell,
} from "./ui/Table";
import { Card } from "./ui/Card";

interface Props {
	machines: Machine[];
	maintenanceRecords: MaintenanceRecord[];
	addToast: (toast: any) => void;
}

const MonthlySummaryView: React.FC<Props> = ({
	machines,
	maintenanceRecords,
	addToast,
}) => {
	const [month, setMonth] = useState<string>(
		new Date().toISOString().slice(0, 7),
	); // YYYY-MM
	const [selectedMachineId, setSelectedMachineId] = useState<string>(
		machines[0]?.id || "",
	);
	const [viewMode, setViewMode] = useState<"dashboard" | "calendar">(
		"dashboard",
	);
	const [isAIModalOpen, setIsAIModalOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const [monthlyStats, setMonthlyStats] = useState<MachineMonthlyStat[]>([]);
	const [globalSettings, setGlobalSettings] = useState<{
		intemperieDays: string[];
	}>({ intemperieDays: [] });
	const [loading, setLoading] = useState(false);

	// Local state for inline configuration
	const [configStartHours, setConfigStartHours] = useState<number>(0);
	const [configEndHours, setConfigEndHours] = useState<number>(0);
	const [configWeekends, setConfigWeekends] = useState<boolean>(false);
	const [configDirty, setConfigDirty] = useState(false);
	const [editingBreakdownDate, setEditingBreakdownDate] = useState<
		string | null
	>(null);
	const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
	const [tempBreakdownDate, setTempBreakdownDate] = useState<string | null>(
		null,
	);
	const [tempBreakdownHours, setTempBreakdownHours] = useState<number>(8);
	const [isIdleModalOpen, setIsIdleModalOpen] = useState(false);
	const [tempIdleDate, setTempIdleDate] = useState<string | null>(null);
	const [tempIdleHours, setTempIdleHours] = useState<number>(8);

	// Fetch Stats & Settings
	useEffect(() => {
		fetchData();
	}, [month]);

	const fetchData = async () => {
		setLoading(true);
		try {
			const { data: statsData, error: statsError } = await supabase
				.from("machine_monthly_stats")
				.select("*")
				.eq("month", month);

			if (statsError) throw statsError;

			const transformedStats: MachineMonthlyStat[] = (statsData || []).map(
				(s: any) => ({
					id: s.id,
					machineId: s.machine_id,
					month: s.month,
					startHours: s.start_hours,
					endHours: s.end_hours,
					worksOnWeekends: s.works_on_weekends,
					breakdownDays: s.breakdown_days || [],
					breakdownHours: s.breakdown_hours || {},
					idleDays: s.idle_days || [],
					idleHours: s.idle_hours || {},
				}),
			);
			setMonthlyStats(transformedStats);

			const { data: settingsData } = await supabase
				.from("global_monthly_settings")
				.select("*")
				.eq("month", month)
				.single();

			setGlobalSettings({
				intemperieDays: settingsData?.intemperie_days || [],
			});
		} catch (error: any) {
			console.error("Error fetching monthly data:", error);
		} finally {
			setLoading(false);
		}
	};

	const selectedMachine = machines.find((m) => m.id === selectedMachineId);
	const currentStat = monthlyStats.find(
		(s) => s.machineId === selectedMachineId,
	);

	// Sync config state with selected machine
	useEffect(() => {
		if (selectedMachine) {
			if (currentStat) {
				setConfigStartHours(currentStat.startHours);
				setConfigEndHours(currentStat.endHours);
				setConfigWeekends(currentStat.worksOnWeekends);
			} else {
				setConfigStartHours(selectedMachine.serviceHours || 0);
				setConfigEndHours(selectedMachine.serviceHours || 0);
				setConfigWeekends(false);
			}
			setConfigDirty(false);
		}
	}, [selectedMachineId, month]); // Only sync when machine or month changes, not on every currentStat ref change

	// Computed Distribution
	const distribution = useMemo(() => {
		if (!selectedMachine) return null;
		// Use current Config state for "Live" preview if dirty, else use persisted stat
		// But for the Chart/Table, we usually want the *Applied* data.
		// Let's rely on the persisted `currentStat` for the main view to avoid confusion,
		// or use a temporary object for "Preview"?
		// For simplicity: The main view uses `currentStat`. One must "Save" to see changes.
		if (!currentStat) return null;
		return calculateMonthlyDistribution(currentStat, {
			intemperieDays: globalSettings.intemperieDays,
			forcedWorkDays: [],
		});
	}, [selectedMachine, currentStat, globalSettings]);

	// Potential Hours (Theoretical Capacity)
	const potentialHours = useMemo(() => {
		if (!distribution) return 0;
		// Potential = Workable Hours (exclude non-workable states like weekends and bad weather)
		// Panne is kept in potential because it's a machine failure on a workable day.
		return (
			distribution.days.filter(
				(d) => d.status !== "WEEKEND" && d.status !== "INTEMPERIE",
			).length * 8
		);
	}, [distribution]);

	// Summary of distribution groups (e.g., "15 days at 7h/1h")
	const distributionSummary = useMemo(() => {
		if (!distribution) return [];
		const groups: Record<string, number> = {};
		distribution.days.forEach((d) => {
			// Typically only for WORK, CHOMAGE, or PANNE days
			if (d.status === "WEEKEND" || d.status === "INTEMPERIE") return;

			const service = d.workHours + d.overtimeHours;
			const key = `${service}h Service / ${d.idleHours}h Chômage${d.breakdownHours > 0 ? ` / ${d.breakdownHours}h Panne` : ""}`;
			groups[key] = (groups[key] || 0) + 1;
		});
		return Object.entries(groups).map(([label, count]) => ({ label, count }));
	}, [distribution]);

	// Handle Save Config
	const handleSaveConfig = async () => {
		if (!selectedMachine) return;
		const payload = {
			machine_id: selectedMachine.id,
			month: month,
			start_hours: configStartHours,
			end_hours: configEndHours,
			works_on_weekends: configWeekends,
			breakdown_days: currentStat?.breakdownDays || [],
			breakdown_hours: currentStat?.breakdownHours || {},
			idle_days: currentStat?.idleDays || [],
			idle_hours: currentStat?.idleHours || {},
		};

		const { error } = await supabase
			.from("machine_monthly_stats")
			.upsert(payload, { onConflict: "machine_id, month" });

		if (error) {
			addToast({ type: "error", title: "Erreur", description: error.message });
		} else {
			addToast({
				type: "success",
				title: "Succès",
				description: "Configuration sauvegardée",
			});
			fetchData();
			setConfigDirty(false);
		}
	};

	const toggleBreakdownDay = async (date: string) => {
		if (!currentStat) {
			addToast({
				type: "warning",
				title: "Attention",
				description:
					"Veuillez d'abord sauvegarder la configuration initiale (Heures Début/Fin).",
			});
			return;
		}
		const isBroken = currentStat.breakdownDays.includes(date);

		let newDays = [...currentStat.breakdownDays];
		let newHours = { ...(currentStat.breakdownHours || {}) };

		if (isBroken) {
			newDays = newDays.filter((d) => d !== date);
			delete newHours[date];

			// Update DB & State
			const updatedStats = monthlyStats.map((s) =>
				s.machineId === selectedMachineId
					? { ...s, breakdownDays: newDays, breakdownHours: newHours }
					: s,
			);
			setMonthlyStats(updatedStats);
			await supabase
				.from("machine_monthly_stats")
				.update({ breakdown_days: newDays, breakdown_hours: newHours })
				.eq("id", currentStat.id);
		} else {
			// Open modal for hours input
			setTempBreakdownDate(date);
			setTempBreakdownHours(8); // Default
			setIsBreakdownModalOpen(true);
		}
	};

	const handleUpdateBreakdownHours = async (date: string, hours: number) => {
		if (!currentStat) return;

		let newDays = [...currentStat.breakdownDays];
		if (!newDays.includes(date)) {
			newDays.push(date);
		}

		let newHours = { ...(currentStat.breakdownHours || {}), [date]: hours };

		// Optimistic Update
		const updatedStats = monthlyStats.map((s) =>
			s.machineId === selectedMachineId
				? { ...s, breakdownDays: newDays, breakdownHours: newHours }
				: s,
		);
		setMonthlyStats(updatedStats);
		setEditingBreakdownDate(null);

		await supabase
			.from("machine_monthly_stats")
			.update({ breakdown_days: newDays, breakdown_hours: newHours })
			.eq("id", currentStat.id);

		setIsBreakdownModalOpen(false);
		setTempBreakdownDate(null);
	};

	const toggleIdleDay = async (date: string) => {
		// If currentStat is missing, we can't save anyway, but we should at least let the user know
		// or create a default stat object.
		// However, if the calendar is showing, currentStat must exist because of distribution memo.
		if (!currentStat) {
			addToast({
				type: "warning",
				title: "Attention",
				description:
					"Veuillez d'abord sauvegarder la configuration initiale (Heures Début/Fin).",
			});
			return;
		}
		const isIdle = currentStat.idleDays?.includes(date);

		let newDays = [...(currentStat.idleDays || [])];
		let newHours = { ...(currentStat.idleHours || {}) };

		if (isIdle) {
			newDays = newDays.filter((d) => d !== date);
			delete newHours[date];

			// Update DB & State
			const updatedStats = monthlyStats.map((s) =>
				s.machineId === selectedMachineId
					? { ...s, idleDays: newDays, idleHours: newHours }
					: s,
			);
			setMonthlyStats(updatedStats);
			await supabase
				.from("machine_monthly_stats")
				.update({ idle_days: newDays, idle_hours: newHours })
				.eq("id", currentStat.id);
		} else {
			// Open modal for hours input
			setTempIdleDate(date);
			setTempIdleHours(8); // Default
			setIsIdleModalOpen(true);
		}
	};

	const handleUpdateIdleHours = async (date: string, hours: number) => {
		if (!currentStat) return;

		let newDays = [...(currentStat.idleDays || [])];
		if (!newDays.includes(date)) {
			newDays.push(date);
		}

		let newHours = { ...(currentStat.idleHours || {}), [date]: hours };

		// Optimistic Update
		const updatedStats = monthlyStats.map((s) =>
			s.machineId === selectedMachineId
				? { ...s, idleDays: newDays, idleHours: newHours }
				: s,
		);
		setMonthlyStats(updatedStats);

		await supabase
			.from("machine_monthly_stats")
			.update({ idle_days: newDays, idle_hours: newHours })
			.eq("id", currentStat.id);

		setIsIdleModalOpen(false);
		setTempIdleDate(null);
	};

	const toggleIntemperieDay = async (date: string) => {
		const isIntemperie = globalSettings.intemperieDays.includes(date);
		const newDays = isIntemperie
			? globalSettings.intemperieDays.filter((d) => d !== date)
			: [...globalSettings.intemperieDays, date];
		setGlobalSettings({ intemperieDays: newDays });
		await supabase
			.from("global_monthly_settings")
			.upsert({ month, intemperie_days: newDays }, { onConflict: "month" });
	};

	const handleExportExcel = () => {
		if (!monthlyStats.length) return;
		const resultsMap = new Map<string, MonthlyDistributionResult | null>();
		machines.forEach((m) => {
			const stat = monthlyStats.find((s) => s.machineId === m.id);
			if (stat) {
				const res = calculateMonthlyDistribution(stat, {
					intemperieDays: globalSettings.intemperieDays,
					forcedWorkDays: [],
				});
				resultsMap.set(m.id, res);
			} else {
				resultsMap.set(m.id, null);
			}
		});

		exportMonthlySynthesisToExcel(month, machines, resultsMap);
	};

	const chartData = distribution
		? distribution.days.map((d) => ({
				day: new Date(d.date).getDate(),
				work: d.workHours,
				total: 8, // Capacity line?
			}))
		: [];

	const filteredMachines = useMemo(() => {
		if (!searchQuery) return machines;
		const lowerQuery = searchQuery.toLowerCase();
		return machines.filter(
			(m) =>
				m.designation.toLowerCase().includes(lowerQuery) ||
				m.code.toLowerCase().includes(lowerQuery),
		);
	}, [machines, searchQuery]);

	return (
		<div className='space-y-6 font-sans text-foreground'>
			{/* Top Header Row within View */}
			{/* Top Header Row within View */}
			<div className='flex flex-col sm:flex-row justify-between items-center bg-card text-card-foreground p-3 sm:p-4 rounded-2xl border-2 border-foreground shadow-[5px_6px_0_0_hsl(var(--foreground))] gap-4 sm:gap-0'>
				<div className='flex items-center gap-3 sm:gap-4 w-full sm:w-auto'>
					<div className='bg-primary p-2 rounded-xl border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] hidden sm:block'>
						<CalendarIcon className='w-6 h-6 text-primary-foreground' />
					</div>
					<div className='flex-1 sm:flex-none'>
						<h2 className='text-lg sm:text-xl font-black tracking-tight text-foreground uppercase'>
							Pointage Pro
						</h2>
						<div className='flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-muted-foreground mt-1'>
							<div className='flex items-center gap-2 bg-card px-3 py-1.5 rounded-full border-2 border-foreground'>
								<input
									type='month'
									value={month}
									onChange={(e) => setMonth(e.target.value)}
									className='h-6 w-28 sm:w-32 bg-transparent border-none text-foreground text-[10px] sm:text-xs font-extrabold focus:ring-0 p-0'
								/>
							</div>
							{(() => {
								const { start, end } = calculatePeriodDates(month);
								const format = (d: Date) =>
									d.toLocaleDateString("fr-FR", {
										day: "2-digit",
										month: "2-digit",
									});
								return (
									<div className='text-[9px] sm:text-[10px] font-bold bg-primary text-primary-foreground px-3 py-1.5 rounded-full border-2 border-foreground whitespace-nowrap'>
										{format(start)} AU {format(end)}
									</div>
								);
							})()}
						</div>
					</div>
				</div>
				<div className='flex bg-card rounded-full p-1.5 gap-1.5 border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] w-full sm:w-auto shrink-0'>
					<button
						onClick={() => setViewMode("dashboard")}
						className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-extrabold transition-all uppercase tracking-wide ${viewMode === "dashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
						Dashboard
					</button>
					<button
						onClick={() => setViewMode("calendar")}
						className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-[10px] sm:text-xs font-extrabold transition-all uppercase tracking-wide ${viewMode === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
						Calendrier
					</button>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-4 gap-6'>
				{/* Left Sidebar: Fleet & Config */}
				<div className='lg:col-span-1 space-y-6'>
					{/* Fleet List */}
					<div className='bg-card rounded-2xl shadow-[5px_6px_0_0_hsl(var(--foreground))] p-4 sm:p-6 border-2 border-foreground'>
						<div className='flex justify-between items-center mb-4'>
							<h3 className='text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider'>
								FLOTTE ({filteredMachines.length})
							</h3>
						</div>

						{/* Search Input */}
						<div className='relative mb-4'>
							<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
								<SearchIcon className='h-4 w-4 text-muted-foreground' />
							</div>
							<Input
								type='text'
								placeholder='Rechercher...'
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className='pl-10 h-10 rounded-full text-xs font-bold'
							/>
						</div>

						<div className='flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[400px] pb-6 lg:pb-0 lg:pr-3 scrollbar-hide'>
							{filteredMachines.map((m) => {
								const stat = monthlyStats.find((s) => s.machineId === m.id);
								const isSelected = selectedMachineId === m.id;
								return (
									<div
										key={m.id}
										onClick={() => setSelectedMachineId(m.id)}
										className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all border-2 whitespace-nowrap lg:whitespace-normal shrink-0 lg:shrink ${
											isSelected
												? "bg-primary/5 border-primary shadow-[2px_2px_0_0_hsl(var(--primary))]"
												: "bg-card border-foreground/20 hover:border-foreground hover:shadow-[2px_2px_0_0_hsl(var(--foreground))]"
										}`}>
										<div className='flex flex-row lg:flex-row justify-between items-start gap-4 lg:gap-2'>
											<div className='min-w-[100px] lg:min-w-0'>
												<div
													className={`text-xs sm:text-sm font-bold ${isSelected ? "text-primary" : "text-foreground"}`}>
													{m.designation}
												</div>
												<div className='text-[10px] text-muted-foreground mt-0.5'>
													{m.code}
												</div>
											</div>
											{stat && stat.endHours > stat.startHours && (
												<div className='text-[9px] sm:text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full border-2 border-foreground shrink-0'>
													{(stat.endHours - stat.startHours).toFixed(0)}H
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</div>

					{/* Inline Configuration */}
					{selectedMachine && (
						<div className='bg-card rounded-2xl shadow-[5px_6px_0_0_hsl(var(--foreground))] p-6 border-2 border-foreground'>
							<h3 className='text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6'>
								CONFIGURATION
							</h3>
							{/* Weekend Toggle */}
							<div className='bg-muted/50 p-4 rounded-xl border-2 border-foreground/15 flex items-center justify-between mb-6'>
								<span className='text-sm font-semibold text-foreground'>
									TRAVAIL 7J/7
								</span>
								<div
									onClick={() => {
										setConfigWeekends(!configWeekends);
										setConfigDirty(true);
									}}
									className={`w-12 h-6 rounded-full cursor-pointer transition-colors relative ${configWeekends ? "bg-primary" : "bg-muted-foreground/30"}`}>
									<div
										className={`absolute top-1 w-4 h-4 bg-card rounded-full transition-transform ${configWeekends ? "left-7" : "left-1"}`}
									/>
								</div>
							</div>

							<h3 className='text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4'>
								COMPTEURS
							</h3>
							<div className='space-y-4'>
								<div>
									<div className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1'>
										Début
									</div>
									<Input
										type='number'
										value={configStartHours}
										onChange={(e) => {
											setConfigStartHours(Number(e.target.value));
											setConfigDirty(true);
										}}
										className='h-12 rounded-xl text-lg font-black text-center'
										placeholder='0'
									/>
								</div>
								<div>
									<div className='text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 ml-1'>
										Fin
									</div>
									<Input
										type='number'
										value={configEndHours}
										onChange={(e) => {
											setConfigEndHours(Number(e.target.value));
											setConfigDirty(true);
										}}
										className='h-12 rounded-xl text-lg font-black text-center'
										placeholder='0'
									/>
								</div>
							</div>

							<div className='mt-6'>
								<Button
									onClick={handleSaveConfig}
									className='w-full h-12'
									disabled={!configDirty}>
									ENREGISTRER
								</Button>
							</div>
						</div>
					)}
				</div>

				{/* Right Content */}
				<div className='lg:col-span-3 space-y-6'>
					{/* KPI Cards & Actions Wrapper */}
					<div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between w-full'>
						{/* KPI Cards */}
						<div className='grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-row gap-3 sm:gap-4 w-full lg:w-auto lg:flex-1'>
							{[
								{
									label: "POTENTIEL",
									value: `${potentialHours}h`,
									color: "text-foreground",
								},
								{
									label: "SERVICE",
									value: distribution
										? `${(distribution.totalWorkHours + distribution.totalOvertimeHours).toFixed(0)}h`
										: "-",
									color: "text-primary",
								},
								{
									label: "INTEMPÉRÉ",
									value: distribution
										? `${distribution.totalIntemperieHours.toFixed(0)}h`
										: "-",
									color: "text-blue-500",
								},
								{
									label: "PANNE",
									value: distribution
										? `${distribution.totalBreakdownHours.toFixed(0)}h`
										: "-",
									color: "text-destructive",
								},
								{
									label: "CHÔMAGE",
									value: distribution
										? `${distribution.totalIdleHours.toFixed(0)}h`
										: "-",
									color: "text-warning",
								},
							].map((stat, i) => (
								<div
									key={i}
									className={`bg-card px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-[3px_4px_0_0_hsl(var(--foreground))] flex flex-col items-center border-2 border-foreground ${i === 4 ? "col-span-2 sm:col-span-1" : ""} lg:min-w-[120px]`}>
									<div className='flex items-center gap-1.5 mb-1'>
										{stat.label === "INTEMPÉRÉ" && (
											<CloudRainIcon className='w-3 h-3 text-blue-500' />
										)}
										<span className='text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider'>
											{stat.label}
										</span>
									</div>
									<span
										className={`text-xl sm:text-2xl font-black ${stat.color}`}>
										{stat.value}
									</span>
								</div>
							))}
						</div>

						{/* Action Buttons */}
						<div className='flex flex-row gap-3 w-full lg:w-auto shrink-0'>
							<Button
								onClick={handleExportExcel}
								variant="adding"
								className='flex-1 lg:flex-none px-4 sm:px-6 h-12 lg:h-16 gap-2'>
								<Download size={18} strokeWidth={2.5} />
							</Button>
							<Button
								onClick={() => setIsAIModalOpen(true)}
								className='flex-1 lg:flex-none px-4 sm:px-6 h-12 lg:h-16 gap-2'>
								<Sparkles size={18} strokeWidth={2.5} />
							</Button>
						</div>
					</div>

					{/* Main View Area */}
					{/* Main View Area */}
					{viewMode === "dashboard" ? (
						<>
							{/* Chart Section */}
							<div className='bg-card p-4 sm:p-8 rounded-2xl shadow-[5px_6px_0_0_hsl(var(--foreground))] border-2 border-foreground'>
								<h3 className='text-[10px] sm:text-sm font-black text-foreground uppercase tracking-wider mb-6 sm:mb-8'>
									PERFORMANCE QUOTIDIENNE
								</h3>
								<div className='h-[200px] sm:h-[300px] w-full'>
									<ResponsiveContainer width='100%' height='100%'>
										<BarChart data={chartData} barCategoryGap={10}>
											<CartesianGrid
												strokeDasharray='3 3'
												vertical={false}
												stroke='hsl(var(--muted))'
											/>
											<XAxis
												dataKey='day'
												axisLine={false}
												tickLine={false}
												tick={{
													fill: "hsl(var(--muted-foreground))",
													fontSize: 12,
												}}
												dy={10}
											/>
											<Tooltip
												cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
												contentStyle={{
													borderRadius: "12px",
													border: "2px solid hsl(var(--foreground))",
													boxShadow: "3px 3px 0 0 hsl(var(--foreground))",
													backgroundColor: "hsl(var(--card))",
													color: "hsl(var(--foreground))",
													fontWeight: 700,
												}}
											/>
											<Bar
												dataKey='work'
												fill='hsl(var(--primary))'
												stroke='hsl(var(--foreground))'
												strokeWidth={2}
												radius={[6, 6, 0, 0]}
												barSize={12}
											/>
										</BarChart>
									</ResponsiveContainer>
								</div>
							</div>

							{/* Table Section */}
							{distribution && (
								<div className='bg-card p-4 sm:p-6 rounded-2xl shadow-[5px_6px_0_0_hsl(var(--foreground))] border-2 border-foreground overflow-hidden'>
									<h3 className='text-[10px] sm:text-sm font-black text-foreground uppercase tracking-wider mb-4'>
										SYNTHÈSE DE LA DISTRIBUTION
									</h3>

									{/* Distribution Grouping Bar */}
									<div className='flex flex-wrap gap-2 mb-6 p-2 bg-muted/30 rounded-xl border-2 border-foreground/15'>
										{distributionSummary.map((group, idx) => (
											<div
												key={idx}
												className='bg-card px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] flex items-center gap-3'>
												<span className='bg-primary border-2 border-foreground text-primary-foreground px-2 py-0.5 rounded-lg text-[9px]'>
													{group.count} JOURS
												</span>
												<span className='text-muted-foreground uppercase tracking-tight'>
													{group.label}
												</span>
											</div>
										))}
										{distributionSummary.length === 0 && (
											<div className='text-[10px] text-muted-foreground px-4 py-2'>
												Aucune donnée de distribution
											</div>
										)}
									</div>

									<div className='overflow-x-auto'>
										<Table>
											<TableHeader>
												<TableRow className='border-b-border hover:bg-transparent'>
													<TableHead className='font-bold text-xs uppercase text-muted-foreground'>
														Jour
													</TableHead>
													<TableHead className='font-bold text-xs uppercase text-muted-foreground text-center'>
														Travail
													</TableHead>
													<TableHead className='font-bold text-xs uppercase text-muted-foreground text-center'>
														Chômage
													</TableHead>
													<TableHead className='font-bold text-xs uppercase text-muted-foreground text-center'>
														Panne
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{distribution.days.map((day) => (
													<TableRow
														key={day.date}
														className='border-b-muted hover:bg-muted/50'>
														<TableCell className='font-semibold text-foreground text-sm'>
															{new Date(day.date).getDate()}
														</TableCell>
														<TableCell className='text-center text-sm font-bold text-primary'>
															{day.workHours + day.overtimeHours > 0 ? (
																<div className='w-full bg-primary/10 h-8 rounded-lg border-2 border-foreground/10 flex items-center justify-center'>
																	{(day.workHours + day.overtimeHours).toFixed(
																		0,
																	)}
																	h
																</div>
															) : (
																"-"
															)}
														</TableCell>
														<TableCell className='text-center text-sm font-bold text-warning'>
															{day.idleHours > 0 ? (
																<div className='w-full bg-warning/10 h-8 rounded-lg border-2 border-foreground/10 flex items-center justify-center'>
																	{day.idleHours.toFixed(0)}h
																</div>
															) : (
																"-"
															)}
														</TableCell>
														<TableCell className='text-center text-sm font-bold text-destructive'>
															{day.breakdownHours > 0 ? (
																<div className='w-full bg-destructive/10 h-8 rounded-lg border-2 border-foreground/10 flex items-center justify-center'>
																	{day.breakdownHours.toFixed(0)}h
																</div>
															) : (
																"-"
															)}
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>
							)}
						</>
					) : (
						/* Calendar View */
						<div className='bg-card p-4 sm:p-8 rounded-2xl shadow-[5px_6px_0_0_hsl(var(--foreground))] border-2 border-foreground min-h-[400px] sm:min-h-[600px]'>
							<h3 className='text-lg sm:text-xl font-black text-foreground uppercase tracking-tight mb-6 sm:mb-8'>
								CALENDRIER
							</h3>
							<div className='grid grid-cols-7 gap-1 sm:gap-4'>
								{["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"].map((d) => (
									<div
										key={d}
										className='text-center text-[8px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2'>
										{d}
									</div>
								))}
								{distribution?.days.map((day, index) => {
									const date = new Date(day.date);
									const dayNum = date.getDate();
									const dateYM = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
									const isCurrentMonth = dateYM === month;

									// Calculate column start for the first day (index 0)
									const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
									const colStart = index === 0 ? dayOfWeek + 1 : undefined;

									// Determine visuals based on status
									let cardStyle =
										"bg-card border-foreground/25 text-foreground hover:border-foreground hover:shadow-[2px_2px_0_0_hsl(var(--foreground))] hover:-translate-y-0.5";
									let numStyle = "text-foreground";

									if (day.status === "PANNE") {
										cardStyle =
											"bg-card border-destructive relative overflow-visible";
									} else if (day.status === "INTEMPERIE") {
										cardStyle =
											"bg-sky-100 border-sky-400 text-sky-700 relative";
										numStyle = "text-sky-700";
									} else if (day.workHours > 0) {
										// Active work day styling if needed
									}

									// Simulate "Selected" look for day 29 in the example or if it matches active interaction
									const isDaySelected = false; // Renamed to avoid confusion

									return (
										<div
											key={day.date}
											onClick={() => toggleIntemperieDay(day.date)}
											style={
												colStart ? { gridColumnStart: colStart } : undefined
											}
											className={`
                                        aspect-square rounded-xl border-2 border-foreground/25 transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 sm:gap-1 relative group
                                        ${cardStyle}
                                        ${day.status === "WEEKEND" ? "bg-muted/50 opacity-60 border-foreground/10" : ""}
                                        ${day.status === "PANNE" ? "ring-2 ring-destructive/10 border-destructive/30" : ""}
                                        ${isDaySelected ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20" : ""}
                                    `}>
											<span
												className={`text-sm sm:text-lg font-bold ${isDaySelected ? "text-primary-foreground" : numStyle}`}>
												{dayNum}
											</span>

											{/* Status Indicators (Icons) */}
											<div className='flex gap-1 mt-1'>
												{day.status === "PANNE" ? (
													<div
														className='flex items-center gap-1.5 bg-rose-500 px-2.5 py-1 rounded-full border-2 border-foreground cursor-pointer hover:bg-rose-600 transition-colors'
														onClick={(e) => {
															e.stopPropagation();
															setTempBreakdownDate(day.date);
															setTempBreakdownHours(day.breakdownHours || 8);
															setIsBreakdownModalOpen(true);
														}}>
														<ExclamationTriangleIcon className='w-4 h-4 text-white' />
														<span className='text-xs font-black text-white'>
															{day.breakdownHours}h
														</span>
													</div>
												) : day.status === "CHOMAGE" ? (
													<div
														className='flex items-center gap-1.5 bg-amber-400 px-2.5 py-1 rounded-full border-2 border-foreground cursor-pointer hover:bg-amber-300 transition-colors'
														onClick={(e) => {
															e.stopPropagation();
															setTempIdleDate(day.date);
															setTempIdleHours(day.idleHours || 8);
															setIsIdleModalOpen(true);
														}}>
														<MoonIcon className='w-4 h-4 text-foreground' />
														<span className='text-xs font-black text-foreground'>
															{day.idleHours}h
														</span>
													</div>
												) : (
													<>
														{day.status === "INTEMPERIE" && (
															<CloudRainIcon className='w-4 h-4 text-blue-500' />
														)}
														{day.workHours > 0 && !isDaySelected && (
															<div className='w-1.5 h-1.5 rounded-full bg-primary mt-1' />
														)}
														{isDaySelected && (
															<WrenchIcon className='w-4 h-4 text-primary-foreground' />
														)}
													</>
												)}
											</div>

											{/* Hover Actions (Invisible unless hovered) */}
											{day.status !== "WEEKEND" && (
												<div className='absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5 z-10'>
													<button
														onClick={(e) => {
															e.stopPropagation();
															toggleIdleDay(day.date);
														}}
														className='w-8 h-8 bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-full flex items-center justify-center text-muted-foreground hover:text-warning hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all'
														title='Marquer comme Chômage'>
														<MoonIcon className='w-4 h-4' />
													</button>
													<button
														onClick={(e) => {
															e.stopPropagation();
															toggleBreakdownDay(day.date);
														}}
														className='w-8 h-8 bg-card border-2 border-foreground shadow-[2px_2px_0_0_hsl(var(--foreground))] rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all'
														title='Marquer comme Panne'>
														<ExclamationTriangleIcon className='w-4 h-4' />
													</button>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>

			{isBreakdownModalOpen && tempBreakdownDate && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn'>
					<div className='bg-card w-full max-w-sm rounded-2xl border-2 border-foreground shadow-[8px_9px_0_0_hsl(var(--foreground))] p-8 animate-slideInUp'>
						<div className='flex flex-col items-center text-center'>
							<div className='w-16 h-16 bg-rose-500 rounded-2xl border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center justify-center mb-6'>
								<ExclamationTriangleIcon className='w-8 h-8 text-white' />
							</div>

							<h3 className='text-xl font-black text-foreground uppercase tracking-tight mb-2'>
								Heures de Panne
							</h3>
							<p className='text-sm text-muted-foreground mb-8'>
								{new Date(tempBreakdownDate).toLocaleDateString("fr-FR", {
									weekday: "long",
									day: "numeric",
									month: "long",
								})}
							</p>

							<div className='w-full space-y-6'>
								<div className='relative'>
									<Input
										type='number'
										autoFocus
										value={tempBreakdownHours}
										onChange={(e) =>
											setTempBreakdownHours(parseFloat(e.target.value) || 0)
										}
										className='h-16 rounded-xl text-3xl font-black text-center text-destructive pr-10'
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleUpdateBreakdownHours(
													tempBreakdownDate,
													tempBreakdownHours,
												);
											}
										}}
									/>
									<span className='absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-destructive/40 uppercase'>
										H
									</span>
								</div>

								<div className='grid grid-cols-2 gap-3'>
									<Button
										onClick={() => {
											setIsBreakdownModalOpen(false);
											setTempBreakdownDate(null);
										}}
										variant="outline"
										className='h-12 flex-1'>
										ANNULER
									</Button>
									<Button
										onClick={() =>
											handleUpdateBreakdownHours(
												tempBreakdownDate,
												tempBreakdownHours,
											)
										}
										variant="destructive"
										className='h-12 flex-1'>
										VALIDER
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}

			{isIdleModalOpen && tempIdleDate && (
				<div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fadeIn'>
					<div className='bg-card w-full max-w-sm rounded-2xl border-2 border-foreground shadow-[8px_9px_0_0_hsl(var(--foreground))] p-8 animate-slideInUp'>
						<div className='flex flex-col items-center text-center'>
							<div className='w-16 h-16 bg-amber-400 rounded-2xl border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))] flex items-center justify-center mb-6'>
								<MoonIcon className='w-8 h-8 text-foreground' />
							</div>

							<h3 className='text-xl font-black text-foreground uppercase tracking-tight mb-2'>
								Heures de Chômage
							</h3>
							<p className='text-sm text-muted-foreground mb-8'>
								{new Date(tempIdleDate).toLocaleDateString("fr-FR", {
									weekday: "long",
									day: "numeric",
									month: "long",
								})}
							</p>

							<div className='w-full space-y-6'>
								<div className='relative'>
									<Input
										type='number'
										autoFocus
										value={tempIdleHours}
										onChange={(e) =>
											setTempIdleHours(parseFloat(e.target.value) || 0)
										}
										className='h-16 rounded-xl text-3xl font-black text-center text-warning pr-10'
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												handleUpdateIdleHours(tempIdleDate, tempIdleHours);
											}
										}}
									/>
									<span className='absolute right-4 top-1/2 -translate-y-1/2 text-lg font-bold text-warning/40 uppercase'>
										H
									</span>
								</div>

								<div className='grid grid-cols-2 gap-3'>
									<Button
										onClick={() => {
											setIsIdleModalOpen(false);
											setTempIdleDate(null);
										}}
										variant="outline"
										className='h-12 flex-1'>
										ANNULER
									</Button>
									<Button
										onClick={() =>
											handleUpdateIdleHours(tempIdleDate, tempIdleHours)
										}
										className='h-12 flex-1'>
										VALIDER
									</Button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default MonthlySummaryView;
