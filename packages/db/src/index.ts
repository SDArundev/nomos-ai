import { env } from "@nomos-ai/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, {
	max: 20,
	idle_timeout: 20,
	connect_timeout: 10,
	max_lifetime: 1800,
});

export async function closeDatabase(): Promise<void> {
	await client.end({ timeout: 5 });
}

export const db = drizzle({ client, schema });

export { sql } from "drizzle-orm";
export {
	createWithId,
	generateAntipatternId,
	generateFeatureId,
	generateInsightId,
	generateLearningId,
	generateMetricId,
	generatePatternId,
	generateProjectId,
	generateSessionId,
} from "./lib/id-generation";
export { runMigrations } from "./migrate";
export {
	type AntipatternInsert,
	type AntipatternSelect,
	type ApiKeyInsert,
	type ApiKeySelect,
	antipatternRepository,
	apiKeyRepository,
	type EventInsert,
	type EventSelect,
	eventRepository,
	type FeatureInsert,
	type FeatureInsightInsert,
	type FeatureInsightSelect,
	type FeatureMetricInsert,
	type FeatureMetricSelect,
	type FeatureSelect,
	featureInsightRepository,
	featureMetricRepository,
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
	type PatternInsert,
	type PatternSelect,
	patternRepository,
	projectRepository,
	type SettingInsert,
	type SettingSelect,
	sessionRepository,
	settingRepository,
	type WorktreeInsert,
	type WorktreeSelect,
	worktreeRepository,
} from "./repositories";
