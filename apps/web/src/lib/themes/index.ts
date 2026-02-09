import {
	type ThemeColors,
	type ThemeDefinition,
	themes,
} from "./theme-registry";

export type { ThemeColors, ThemeDefinition };

export function getThemeById(id: string): ThemeDefinition | undefined {
	return themes.find((t) => t.id === id);
}

export function applyTheme(themeId: string): void {
	const theme = getThemeById(themeId);
	if (!theme) return;

	const root = document.documentElement;
	const colors = theme.dark;

	root.style.setProperty("--background", colors.background);
	root.style.setProperty("--foreground", colors.foreground);
	root.style.setProperty("--card", colors.card);
	root.style.setProperty("--card-foreground", colors.cardForeground);
	root.style.setProperty("--primary", colors.primary);
	root.style.setProperty("--primary-foreground", colors.primaryForeground);
	root.style.setProperty("--secondary", colors.secondary);
	root.style.setProperty("--secondary-foreground", colors.secondaryForeground);
	root.style.setProperty("--muted", colors.muted);
	root.style.setProperty("--muted-foreground", colors.mutedForeground);
	root.style.setProperty("--accent", colors.accent);
	root.style.setProperty("--accent-foreground", colors.accentForeground);
	root.style.setProperty("--destructive", colors.destructive);
	root.style.setProperty("--border", colors.border);
	root.style.setProperty("--input", colors.input);
	root.style.setProperty("--ring", colors.ring);
	root.style.setProperty("--sidebar", colors.sidebar);
	root.style.setProperty("--sidebar-foreground", colors.sidebarForeground);
	root.style.setProperty("--sidebar-accent", colors.sidebarAccent);
	root.style.setProperty(
		"--sidebar-accent-foreground",
		colors.sidebarAccentForeground,
	);
}

export function resetTheme(): void {
	const root = document.documentElement;
	const properties = [
		"--background",
		"--foreground",
		"--card",
		"--card-foreground",
		"--primary",
		"--primary-foreground",
		"--secondary",
		"--secondary-foreground",
		"--muted",
		"--muted-foreground",
		"--accent",
		"--accent-foreground",
		"--destructive",
		"--border",
		"--input",
		"--ring",
		"--sidebar",
		"--sidebar-foreground",
		"--sidebar-accent",
		"--sidebar-accent-foreground",
	];
	for (const prop of properties) {
		root.style.removeProperty(prop);
	}
}

export { themes };
