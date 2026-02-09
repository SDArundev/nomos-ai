import { redirect } from "@tanstack/react-router";
import { authClient } from "./auth-client";

/**
 * Reusable auth guard for TanStack Router's beforeLoad.
 * Redirects unauthenticated users to /login with a returnTo parameter.
 *
 * Usage:
 * ```ts
 * export const Route = createFileRoute("/protected")({
 *   beforeLoad: requireAuth,
 *   component: ProtectedComponent,
 * });
 * ```
 */
export async function requireAuth({
	location,
}: {
	location: { pathname: string };
}) {
	const session = await authClient.getSession();
	if (!session.data) {
		redirect({
			to: "/login",
			search: { returnTo: location.pathname },
			throw: true,
		});
	}
}
