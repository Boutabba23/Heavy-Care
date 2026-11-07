"use client";

import React from "react";
import { Machine, Notification, View, FilterGroup, SparePart } from "../types";
import {
	SparklesIcon,
	CameraIcon,
	BellIcon,
	LogoutIcon,
	UserIcon,
	WrenchIcon,
	FilterIcon,
	CheckCircleIcon,
	ThemeBrushIcon,
	CheckIcon,
} from "../constants";
import { themes } from "../utils/themes";
import { SavedTheme } from "../types";
import GlobalSearch from "./GlobalSearch";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
	currentView: View;
	selectedMachine: Machine | null;
	onOpenAIAssistant: () => void;
	onOpenScanner: () => void;
	onMenuClick: () => void;
	notifications: Notification[];
	isNotificationsOpen: boolean;
	onToggleNotifications: () => void;
	onCloseNotifications: () => void;
	onNotificationClick: (notification: Notification) => void;
	onMarkAllNotificationsAsRead: () => void;
	machines: Machine[];
	filterGroups: FilterGroup[];
	spareParts: SparePart[];
	onSelectMachine: (machineId: string) => void;
	onNavigateToGroup: (groupId: string) => void;
	onSetView: (view: View) => void;
	user: any;
	userEmail: string;
	onLogout: () => void;
	savedThemes: SavedTheme[];
	currentTheme: string;
	onThemeChange: (themeId: string) => void;
}

/** Neo-brutalist actions row under the navbar: page title, global search,
 *  theme picker and user menu. Thick borders, hard shadows, bold type. */
const Header: React.FC<HeaderProps> = (props) => {
	const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
	const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
	const [userMenuView, setUserMenuView] = useState<"menu" | "notifications">(
		"menu",
	);
	const userMenuRef = useRef<HTMLDivElement>(null);
	const themeMenuRef = useRef<HTMLDivElement>(null);

	const [imageError, setImageError] = useState(false);

	const hasUnreadNotifications = props.notifications.some((n) => !n.read);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				userMenuRef.current &&
				!userMenuRef.current.contains(event.target as Node)
			) {
				setIsUserMenuOpen(false);
				setUserMenuView("menu");
			}
			if (
				themeMenuRef.current &&
				!themeMenuRef.current.contains(event.target as Node)
			) {
				setIsThemeMenuOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const getUserName = (email: string) => {
		if (!email) return "Utilisateur";
		const namePart = email.split("@")[0];
		if (namePart.includes(".")) {
			const firstName = namePart.split(".")[0];
			return (
				firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()
			);
		}
		return namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase();
	};

	const userName = getUserName(props.userEmail);

	// Shared brutalist dropdown panel style
	const dropPanel =
		"absolute right-0 mt-2 z-50 border-2 border-foreground bg-card shadow-[5px_5px_0_0_hsl(var(--foreground))] overflow-hidden";
	const dropItem =
		"flex w-full items-center border-2 border-transparent text-foreground transition-colors hover:border-foreground hover:bg-muted";

	const getTitle = () => {
		switch (props.currentView) {
			case View.LANDING:
				return "Accueil";
			case View.DASHBOARD:
				return "Tableau de bord";
			case View.MACHINE_LIST:
				return "Engins";
			case View.MACHINE_DETAIL:
				return props.selectedMachine?.designation || "Détail du Matériel";
			case View.FILTER_MANAGEMENT:
				return "Inventaire";
			case View.MAINTENANCE:
				return "Maintenance Préventive";
			case View.ANALYTICS:
				return "Analyses & Rapports";
			case View.MONTHLY_SUMMARY:
				return "Synthèse Mensuelle";
			case View.SETTINGS:
				return "Paramètres";
			case View.SPARE_PARTS:
				return "Pièces de Rechange";
			case View.OIL_MANAGEMENT:
				return "Gestion des Huiles";
			case View.USER_PROFILE:
				return "Mon Profil";
			default:
				return "";
		}
	};

	const ThemeSwatch = ({ color }: { color: string }) => (
		<div
			className='h-3 w-3 shrink-0 border-2 border-foreground'
			style={{ backgroundColor: color }}
		/>
	);

	const themeRow = (t: { id: string; name: string; colors: any }, isSaved = false) => (
		<button
			key={t.id}
			onClick={() => {
				props.onThemeChange(t.id);
				setIsThemeMenuOpen(false);
			}}
		 className={`flex items-center w-full px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-muted transition-colors ${props.currentTheme === t.id ? "text-primary" : "text-foreground"}`}>
			{isSaved ? (
				<ThemeBrushIcon className='h-3.5 w-3.5 mr-2 text-muted-foreground' />
			) : (
				<ThemeSwatch color={t.colors.primary} />
			)}
			<span className='flex-1 text-left'>{t.name}</span>
			{props.currentTheme === t.id && <CheckIcon className='w-3.5 h-3.5' />}
		</button>
	);

	return (
		<header className='relative z-20 h-16 flex-shrink-0 flex items-center px-4 sm:px-6 border-b-2 border-foreground bg-card'>
			{/* Page title */}
			<div className='flex shrink-0 items-center text-sm font-black uppercase tracking-widest text-foreground sm:text-base'>
				{getTitle()}
			</div>

			<div className='flex-1 flex justify-center px-2 md:px-8'>
				<GlobalSearch
					machines={props.machines}
					filterGroups={props.filterGroups}
					spareParts={props.spareParts}
					onSelectMachine={props.onSelectMachine}
					onNavigateToGroup={props.onNavigateToGroup}
					onSetView={props.onSetView}
				/>
			</div>

			<div className='flex shrink-0 items-center gap-2'>
				{/* Theme Selector */}
				<div className='relative' ref={themeMenuRef}>
					<button
						onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
						className='flex h-9 w-9 items-center justify-center border-2 border-foreground bg-card transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none'
						title='Changer le thème'
					>
						{(() => {
							const activeTheme =
								themes.find((t) => t.id === props.currentTheme) ||
								props.savedThemes.find((t) => t.id === props.currentTheme) ||
								themes[0];
							const themeColor = activeTheme.colors.primary;
							return (
								<ThemeBrushIcon
									className='h-4 w-4'
									style={{ color: themeColor }}
								/>
							);
						})()}
					</button>

					{isThemeMenuOpen && (
						<div className={`${dropPanel} w-60`}>
							<div className='border-b-2 border-foreground bg-muted px-3 py-2'>
								<p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
									Thèmes Prédéfinis
								</p>
							</div>
							<div className='max-h-48 overflow-y-auto'>
								{(themes as any[]).map((t) => themeRow(t))}
							</div>

							{props.savedThemes.length > 0 && (
								<>
									<div className='border-y-2 border-foreground bg-muted px-3 py-2'>
										<p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
											Mes Thèmes
										</p>
									</div>
									<div className='max-h-48 overflow-y-auto'>
										{(props.savedThemes as any[]).map((t) =>
											themeRow(t, true),
										)}
									</div>
								</>
							)}

							<div className='border-t-2 border-foreground p-2'>
								<button
									onClick={() => {
										props.onSetView(View.SETTINGS);
										setIsThemeMenuOpen(false);
									}}
									className='w-full border-2 border-foreground bg-card py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none'>
									Gérer les thèmes
								</button>
							</div>
						</div>
					)}
				</div>

				{/* Square avatar — opens unified user menu (desktop & mobile) */}
				<div className='relative' ref={userMenuRef}>
					<button
						onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
						className='relative focus:outline-none'
						aria-label='Menu utilisateur'
					>
						<div className='flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center overflow-hidden border-2 border-foreground bg-muted transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none'>
							{!imageError ? (
								<img
									src={
										props.user?.user_metadata?.avatar_url ||
										`https://ui-avatars.io/api/?name=${encodeURIComponent(userName)}&background=random`
									}
									alt={userName}
									className='w-full h-full object-cover'
									referrerPolicy='no-referrer'
									onError={() => setImageError(true)}
								/>
							) : (
								<span className='text-sm font-black uppercase text-foreground'>
									{userName.charAt(0).toUpperCase()}
								</span>
							)}
						</div>
						{hasUnreadNotifications && (
							<span className='absolute -top-1.5 -right-1.5 h-3 w-3 border-2 border-foreground bg-destructive' />
						)}
					</button>

					{isUserMenuOpen && (
						<div
							className={`${dropPanel} w-72 sm:w-80 ${
								userMenuView === "notifications" ? "flex flex-col max-h-[80vh]" : ""
							}`}
						>
							{userMenuView === "menu" ? (
								<>
									<div className='border-b-2 border-foreground bg-muted px-4 py-3'>
										<p className='truncate text-sm font-black uppercase tracking-wide text-foreground'>
											{userName}
										</p>
										<p className='truncate text-xs text-muted-foreground'>
											{props.userEmail}
										</p>
									</div>

									<div className='border-b-2 border-foreground px-2 py-2'>
										<button
											onClick={() => {
												props.onOpenScanner();
												setIsUserMenuOpen(false);
											}}
											className={`${dropItem} px-2 py-2 text-sm font-bold uppercase tracking-wide`}>
											<CameraIcon className='h-4 w-4 mr-3 text-muted-foreground' />
											Scanner QR
										</button>
										<button
											onClick={() => {
												props.onOpenAIAssistant();
												setIsUserMenuOpen(false);
											}}
											className={`${dropItem} px-2 py-2 text-sm font-bold uppercase tracking-wide`}>
											<SparklesIcon className='h-4 w-4 mr-3 text-primary' />
											Assistant HeavyCare
										</button>
										<button
											onClick={() => setUserMenuView("notifications")}
											className={`${dropItem} px-2 py-2 text-sm font-bold uppercase tracking-wide`}>
											<div className='relative mr-3'>
												<BellIcon className='h-4 w-4 text-muted-foreground' />
												{hasUnreadNotifications && (
													<span className='absolute -top-1 -right-1 h-2 w-2 border border-foreground bg-destructive' />
												)}
											</div>
											Notifications
										</button>
									</div>

									<button
										onClick={() => {
											props.onSetView(View.USER_PROFILE);
											setIsUserMenuOpen(false);
										}}
										className={`${dropItem} px-2 py-2 text-sm font-bold uppercase tracking-wide`}>
										<span className='mr-3 flex h-8 w-8 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground'>
											<UserIcon className='h-4 w-4' />
										</span>
										Mon Profil
									</button>

									<div className='border-t-2 border-foreground px-2 py-2'>
										<button
											onClick={() => {
												props.onLogout();
												setIsUserMenuOpen(false);
											}}
											className='flex w-full items-center border-2 border-transparent px-2 py-2 text-sm font-bold uppercase tracking-wide text-destructive transition-colors hover:border-foreground hover:bg-destructive/10'>
											<LogoutIcon className='h-4 w-4 mr-3' />
											Déconnexion
										</button>
									</div>
								</>
							) : (
								<div className='flex flex-col max-h-[80vh]'>
									<div className='sticky top-0 z-10 flex items-center justify-between border-b-2 border-foreground bg-card p-3'>
										<button
											onClick={() => setUserMenuView("menu")}
											className='border-2 border-foreground bg-card px-2 py-1 text-[10px] font-black uppercase tracking-widest text-foreground transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none'>
											← Retour
										</button>
										<p className='text-[10px] font-black uppercase tracking-widest text-muted-foreground'>
											Notifications
										</p>
										{hasUnreadNotifications && (
											<button
												onClick={props.onMarkAllNotificationsAsRead}
												className='flex h-7 w-7 items-center justify-center border-2 border-foreground bg-card text-primary transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_hsl(var(--foreground))] active:translate-x-0 active:translate-y-0 active:shadow-none'
												title='Tout marquer comme lu'>
												<CheckCircleIcon className='h-4 w-4' />
											</button>
										)}
									</div>
									<div className='flex-1 divide-y-2 divide-foreground/10 overflow-y-auto'>
										{props.notifications.length > 0 ? (
											props.notifications
												.sort(
													(a, b) =>
														new Date(b.createdAt).getTime() -
														new Date(a.createdAt).getTime(),
												)
												.map((notification) => (
													<button
														key={notification.id}
														onClick={() => {
															props.onNotificationClick(notification);
															setIsUserMenuOpen(false);
															setUserMenuView("menu");
														}}
														className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 border-2 border-transparent hover:border-foreground hover:bg-muted ${
															!notification.read ? "bg-muted" : ""
														}`}>
														<div
															className={`flex-shrink-0 flex h-8 w-8 items-center justify-center border-2 border-foreground ${
																notification.type === "maintenance"
																	? "bg-warning text-warning-foreground"
																	: "bg-destructive text-destructive-foreground"
															}`}>
															{notification.type === "maintenance" ? (
																<WrenchIcon className='h-4 w-4' />
															) : (
																<FilterIcon className='h-4 w-4' />
															)}
														</div>
														<div className='flex-1 min-w-0'>
															<p
																className={`text-xs leading-relaxed ${
																	!notification.read
																		? "font-black text-foreground"
																		: "text-muted-foreground"
																}`}>
																{notification.message}
															</p>
															<p className='mt-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
																{new Date(
																	notification.createdAt,
																).toLocaleDateString("fr-FR", {
																	day: "2-digit",
																	month: "short",
																})}{" "}
																—{" "}
																{new Date(
																	notification.createdAt,
																).toLocaleTimeString("fr-FR", {
																	hour: "2-digit",
																	minute: "2-digit",
																})}
															</p>
														</div>
														{!notification.read && (
															<div className='mt-1.5 h-2 w-2 shrink-0 border border-foreground bg-primary' />
														)}
													</button>
												))
										) : (
											<div className='py-10 text-center px-4'>
												<BellIcon className='h-8 w-8 text-muted-foreground/20 mx-auto mb-2' />
												<p className='text-sm text-muted-foreground'>
													Aucune notification
												</p>
											</div>
										)}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</header>
	);
};

export default Header;
