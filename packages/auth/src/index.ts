import { db } from "@nomos-ai/db";
import * as schema from "@nomos-ai/db/schema/auth";
import { env } from "@nomos-ai/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "sqlite",

		schema: schema,
	}),
	trustedOrigins: [env.CORS_ORIGIN],
	emailAndPassword: {
		enabled: true,
	},
	advanced: {
		defaultCookieAttributes: {
			sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
			secure: process.env.NODE_ENV === "production",
			httpOnly: true,
		},
	},
	plugins: [],
});
