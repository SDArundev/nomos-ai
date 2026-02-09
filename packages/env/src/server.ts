import { createEnv } from "@t3-oss/env-core";
import "dotenv/config";
import { z } from "zod";

export const env = createEnv({
	server: {
		DATABASE_URL: z
			.string()
			.min(1)
			.refine(
				(url) =>
					url.startsWith("postgresql://") || url.startsWith("postgres://"),
				{
					message:
						'DATABASE_URL must start with "postgresql://" or "postgres://"',
				},
			),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		CORS_ORIGIN: z.string().min(1),
		PORT: z.coerce.number().int().default(3000),
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		CLAUDE_MODEL: z.string().default("claude-sonnet-4-5-20250929"),
		NOMOS_MOCK_AGENT: z.coerce.boolean().default(false),
		ALLOWED_ROOT_DIRECTORY: z.string().optional(),
		DATA_DIR: z.string().default("./apps/server/data"),
		IS_CONTAINERIZED: z.coerce.boolean().default(false),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
});
