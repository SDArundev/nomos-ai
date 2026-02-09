import type { AppRouterClient } from "@nomos-ai/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	redirect,
	useMatchRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useCallback, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ErrorBoundary } from "@/components/error-boundary";
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { authClient } from "@/lib/auth-client";
import { link, type orpc } from "@/utils/orpc";
import "../index.css";

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	beforeLoad: async ({ location }) => {
		const isLoginRoute = location.pathname === "/login";

		// Don't redirect if already on login page
		if (isLoginRoute) return;

		const session = await authClient.getSession();
		if (!session.data) {
			redirect({
				to: "/login",
				search: { returnTo: location.pathname },
				throw: true,
			});
		}
	},
	head: () => ({
		meta: [
			{
				title: "nomos-ai",
			},
			{
				name: "description",
				content: "nomos-ai - Autonomous AI Development Studio",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/favicon.svg",
			},
		],
	}),
});

function RootComponent() {
	const [client] = useState<AppRouterClient>(() => createORPCClient(link));
	const [_orpcUtils] = useState(() => createTanstackQueryUtils(client));
	const matchRoute = useMatchRoute();
	const isLoginRoute = matchRoute({ to: "/login" });
	const { data: session, isPending } = authClient.useSession();

	const isAuthenticated = !!session?.user;
	const showShell = isAuthenticated && !isLoginRoute;

	const [paletteOpen, setPaletteOpen] = useState(false);
	const [showHelp, setShowHelp] = useState(false);
	const openPalette = useCallback(() => setPaletteOpen(true), []);
	useKeyboardShortcuts(openPalette, () => setShowHelp(true));

	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="dark"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				{showShell ? (
					<div className="flex h-svh overflow-hidden">
						<a
							href="#main-content"
							className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:text-sm focus:shadow-lg"
						>
							Skip to main content
						</a>
						<AppSidebar />
						<div className="flex min-w-0 flex-1 flex-col">
							<Header />
							<main id="main-content" className="flex-1 overflow-auto">
								<ErrorBoundary>
									<Outlet />
								</ErrorBoundary>
							</main>
						</div>
					</div>
				) : (
					<div className="flex h-svh items-center justify-center">
						{isPending ? (
							<div className="text-muted-foreground text-sm">Loading...</div>
						) : (
							<Outlet />
						)}
					</div>
				)}
				<Toaster richColors />
				<CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
				<KeyboardShortcutsHelp open={showHelp} onOpenChange={setShowHelp} />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
