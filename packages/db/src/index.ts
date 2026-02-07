import { resolve } from "node:path";
import { createClient } from "@libsql/client";
import { env } from "@nomos-ai/env/server";
import { drizzle } from "drizzle-orm/libsql";
import { resolveDbUrl } from "./resolve-url";
import * as schema from "./schema";

const monorepoRoot = resolve(import.meta.dirname, "../../..");
const resolvedUrl = resolveDbUrl(env.DATABASE_URL, monorepoRoot);

const client = createClient({
	url: resolvedUrl,
});

export const db = drizzle({ client, schema });

export { sql } from "drizzle-orm";
export { runMigrations } from "./migrate";
export {
	type EventInsert,
	type EventSelect,
	eventRepository,
	type FeatureInsert,
	type FeatureSelect,
	featureRepository,
	type LearningInsert,
	type LearningSelect,
	learningRepository,
	type MessageInsert,
	type MessageSelect,
	messageRepository,
	type NotificationInsert,
	type NotificationSelect,
	notificationRepository,
	projectRepository,
	sessionRepository,
	type SettingInsert,
	type SettingSelect,
	settingRepository,
	type WorktreeInsert,
	type WorktreeSelect,
	worktreeRepository,
} from "./repositories";
