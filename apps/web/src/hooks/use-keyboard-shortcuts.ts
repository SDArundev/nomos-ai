import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

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

export interface KeyboardShortcutCallbacks {
	onOpenPalette: () => void;
	onShowHelp: () => void;
	onNewFeature?: () => void;
	onStartAutoMode?: () => void;
	onFocusSearch?: () => void;
}

export function useKeyboardShortcuts(
	onOpenPalette: () => void,
	onShowHelp?: () => void,
) {
	const navigate = useNavigate();
	const pendingKeyRef = useRef<string | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement;
			const isInput =
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable;

			// Cmd+K / Ctrl+K — command palette
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				onOpenPalette();
				return;
			}

			// Escape — close modals (handled by dialog components, but we can also dispatch)
			if (e.key === "Escape") {
				return; // let the dialog handle it
			}

			// Don't process vim-style shortcuts when in an input
			if (isInput) return;

			// "?" — show keyboard shortcuts help
			if (e.key === "?" && onShowHelp) {
				e.preventDefault();
				onShowHelp();
				return;
			}

			// Vim-style two-key navigation: g + <key>
			if (pendingKeyRef.current === "g") {
				pendingKeyRef.current = null;
				if (timerRef.current) clearTimeout(timerRef.current);

				const routes: Record<string, string> = {
					d: "/dashboard",
					k: "/kanban",
					a: "/agent",
					t: "/terminal",
					s: "/settings",
					h: "/",
					l: "/activity",
				};

				const route = routes[e.key];
				if (route) {
					e.preventDefault();
					navigate({ to: route });
				}
				return;
			}

			if (e.key === "g") {
				pendingKeyRef.current = "g";
				timerRef.current = setTimeout(() => {
					pendingKeyRef.current = null;
				}, 500);
				return;
			}

			// Action shortcuts
			if (e.key === "n") {
				e.preventDefault();
				navigate({ to: "/kanban" });
				return;
			}

			if (e.key === "/" && !isInput) {
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
	}, [navigate, onOpenPalette, onShowHelp]);
}
