import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z
			.string()
			.min(1)
			.refine(
				(url) =>
					url.startsWith("file:") ||
					url.startsWith("libsql://") ||
					url.startsWith("http"),
				{
					message:
						'DATABASE_URL must start with "file:" for SQLite, "libsql://" for Turso, or "http" for remote',
				},
			),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
