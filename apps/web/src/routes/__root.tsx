import type { AppRouterClient } from "@nomos-ai/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	useMatchRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useCallback, useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import { ErrorBoundary } from "@/components/error-boundary";
import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/lib/auth-client";
import { link, type orpc } from "@/utils/orpc";
import "../index.css";

export interface RouterAppContext {
	orpc: typeof orpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
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
	const openPalette = useCallback(() => setPaletteOpen(true), []);
	useKeyboardShortcuts(openPalette);

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
						<AppSidebar />
						<div className="flex min-w-0 flex-1 flex-col">
							<Header />
							<main className="flex-1 overflow-auto">
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
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
