import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef } from "react";
import { useSettingsStore } from "@/store/settings-store";

export interface ShortcutDefinition {
	keys: string[];
	label: string;
	group: "General" | "Navigation" | "Actions";
}

export const SHORTCUTS: ShortcutDefinition[] = [
	// General
	{ keys: ["Cmd", "K"], label: "Open command palette", group: "General" },
	{ keys: ["?"], label: "Show keyboard shortcuts", group: "General" },
	{ keys: ["Esc"], label: "Close modal / dialog", group: "General" },

	// Navigation (vim-style g + key)
	{ keys: ["g", "d"], label: "Go to Dashboard", group: "Navigation" },
	{ keys: ["g", "k"], label: "Go to Kanban", group: "Navigation" },
	{ keys: ["g", "a"], label: "Go to Agent Chat", group: "Navigation" },
	{ keys: ["g", "t"], label: "Go to Terminal", group: "Navigation" },
	{ keys: ["g", "s"], label: "Go to Settings", group: "Navigation" },
	{ keys: ["g", "h"], label: "Go to Home", group: "Navigation" },
	{ keys: ["g", "l"], label: "Go to Activity Log", group: "Navigation" },

	// Actions
	{ keys: ["n"], label: "New feature", group: "Actions" },
	{ keys: ["s"], label: "Start auto-mode", group: "Actions" },
	{ keys: ["/"], label: "Focus search", group: "Actions" },
];

/** Convert a shortcut label to its settings key */
export function shortcutSettingsKey(label: string): string {
	return `shortcuts.${label.replace(/\s+/g, "_").toLowerCase()}`;
}

export interface KeyboardShortcutCallbacks {
	onOpenPalette: () => void;
	onShowHelp: () => void;
	onNewFeature?: () => void;
	onStartAutoMode?: () => void;
	onFocusSearch?: () => void;
}

/**
 * Build a merged shortcuts list where custom bindings override defaults.
 */
function useMergedShortcuts(): ShortcutDefinition[] {
	const settings = useSettingsStore((s) => s.settings);
	return useMemo(() => {
		return SHORTCUTS.map((shortcut) => {
			const key = shortcutSettingsKey(shortcut.label);
			const custom = settings[key];
			if (Array.isArray(custom) && custom.length > 0) {
				return { ...shortcut, keys: custom as string[] };
			}
			return shortcut;
		});
	}, [settings]);
}

/**
 * Find the keys bound to a shortcut label, respecting custom overrides.
 */
function findKeys(
	shortcuts: ShortcutDefinition[],
	label: string,
): string[] | undefined {
	return shortcuts.find((s) => s.label === label)?.keys;
}

/** Check if a key event matches a single-key shortcut binding */
function matchesSingleKey(keys: string[], e: KeyboardEvent): boolean {
	if (keys.length !== 1) return false;
	return e.key === keys[0] || e.key.toLowerCase() === keys[0]?.toLowerCase();
}

export function useKeyboardShortcuts(
	onOpenPalette: () => void,
	onShowHelp?: () => void,
) {
	const navigate = useNavigate();
	const pendingKeyRef = useRef<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const mergedShortcuts = useMergedShortcuts();

	useEffect(() => {
		// Build navigation routes from merged shortcuts
		const navShortcuts = mergedShortcuts.filter(
			(s) => s.group === "Navigation" && s.keys.length === 2,
		);
		const navRouteMap: Record<string, Record<string, string>> = {};
		const defaultRoutes: Record<string, string> = {
			"Go to Dashboard": "/dashboard",
			"Go to Kanban": "/kanban",
			"Go to Agent Chat": "/agent",
			"Go to Terminal": "/terminal",
			"Go to Settings": "/settings",
			"Go to Home": "/",
			"Go to Activity Log": "/activity",
		};
		for (const s of navShortcuts) {
			const route = defaultRoutes[s.label];
			if (route && s.keys[0] && s.keys[1]) {
				const firstKey = s.keys[0].toLowerCase();
				if (!navRouteMap[firstKey]) navRouteMap[firstKey] = {};
				navRouteMap[firstKey][s.keys[1].toLowerCase()] = route;
			}
		}

		// Resolve action shortcut bindings
		const paletteKeys = findKeys(mergedShortcuts, "Open command palette");
		const helpKeys = findKeys(mergedShortcuts, "Show keyboard shortcuts");
		const newFeatureKeys = findKeys(mergedShortcuts, "New feature");
		const startAutoKeys = findKeys(mergedShortcuts, "Start auto-mode");
		const searchKeys = findKeys(mergedShortcuts, "Focus search");

		// Collect all first keys that start two-key sequences
		const twoKeyPrefixes = new Set<string>();
		for (const s of mergedShortcuts) {
			if (s.keys.length === 2 && s.keys[0]) {
				twoKeyPrefixes.add(s.keys[0].toLowerCase());
			}
		}

		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			const isInput =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable;

			// Cmd+K / Ctrl+K — command palette (or custom binding with modifiers)
			if (paletteKeys?.some((k) => k === "Cmd" || k === "Ctrl")) {
				const lastKey = paletteKeys[paletteKeys.length - 1]?.toLowerCase();
				if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === lastKey) {
					e.preventDefault();
					onOpenPalette();
					return;
				}
			}

			// Escape — close modals (handled by dialog components)
			if (e.key === "Escape") {
				return;
			}

			// Don't process vim-style shortcuts when in an input
			if (isInput) return;

			// Show keyboard shortcuts help
			if (helpKeys && onShowHelp && matchesSingleKey(helpKeys, e)) {
				e.preventDefault();
				onShowHelp();
				return;
			}

			// Two-key navigation sequences
			if (pendingKeyRef.current) {
				const pending = pendingKeyRef.current.toLowerCase();
				pendingKeyRef.current = null;
				if (timerRef.current) clearTimeout(timerRef.current);

				const routeMap = navRouteMap[pending];
				if (routeMap) {
					const route = routeMap[e.key.toLowerCase()];
					if (route) {
						e.preventDefault();
						navigate({ to: route });
						return;
					}
				}
				return;
			}

			// Check if this key starts a two-key sequence
			if (twoKeyPrefixes.has(e.key.toLowerCase())) {
				pendingKeyRef.current = e.key;
				timerRef.current = setTimeout(() => {
					pendingKeyRef.current = null;
				}, 500);
				return;
			}

			// Action: New feature
			if (newFeatureKeys && matchesSingleKey(newFeatureKeys, e)) {
				e.preventDefault();
				navigate({ to: "/kanban" });
				return;
			}

			// Action: Start auto-mode — navigate to dashboard
			if (startAutoKeys && matchesSingleKey(startAutoKeys, e)) {
				e.preventDefault();
				navigate({ to: "/dashboard" });
				return;
			}

			// Action: Focus search
			if (searchKeys && matchesSingleKey(searchKeys, e)) {
				e.preventDefault();
				onOpenPalette();
				return;
			}
		};

		window.addEventListener("keydown", handler);
		return () => {
			window.removeEventListener("keydown", handler);
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [navigate, onOpenPalette, onShowHelp, mergedShortcuts]);
}
