import { auth } from "@nomos-ai/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

/**
 * Normalized user object available in all authenticated contexts.
 * Both session auth and API key auth produce this shape.
 */
export interface AuthenticatedUser {
	id: string;
	name?: string;
	email?: string;
	image?: string | null;
}

/**
 * Normalized session available after authentication.
 * Handlers can safely access `context.session.user.id` regardless of auth method.
 */
export interface AuthenticatedSession {
	user: AuthenticatedUser;
}

/**
 * The oRPC context shape used by all route handlers.
 * `session` is null when unauthenticated (public procedures).
 * `session` is always present after `protectedProcedure` middleware.
 */
export interface Context {
	session: AuthenticatedSession | null;
}

export async function createContext({ context }: CreateContextOptions): Promise<Context> {
	// Check for API key auth first (set by apiKeyAuthMiddleware)
	const apiKeyUserId = context.get("apiKeyUserId") as string | undefined;
	if (apiKeyUserId) {
		return {
			session: {
				user: { id: apiKeyUserId },
			},
		};
	}

	const session = await auth.api.getSession({
		headers: context.req.raw.headers,
	});

	if (!session) {
		return { session: null };
	}

	return {
		session: {
			user: {
				id: session.user.id,
				name: session.user.name,
				email: session.user.email,
				image: session.user.image,
			},
		},
	};
}
