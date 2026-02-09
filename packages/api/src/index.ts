import { ORPCError, os } from "@orpc/server";
import type { AuthenticatedSession, Context } from "./context";

export const o = os.$context<Context>();

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) {
		throw new ORPCError("UNAUTHORIZED");
	}
	return next({
		context: {
			session: context.session as AuthenticatedSession,
		},
	});
});

export const protectedProcedure = publicProcedure.use(requireAuth);
