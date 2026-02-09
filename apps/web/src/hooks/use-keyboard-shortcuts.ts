import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

export function useKeyboardShortcuts(onOpenPalette: () => void) {
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
		};

		window.addEventListener("keydown", handler);
		return () => {
			window.removeEventListener("keydown", handler);
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [navigate, onOpenPalette]);
}
