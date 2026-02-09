import { auth } from "@nomos-ai/auth";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
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
	return {
		session,
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
