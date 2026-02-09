import { env } from "@nomos-ai/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL);

export const db = drizzle({ client, schema });

export { sql } from "drizzle-orm";
export {
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
	antipatternRepository,
	type ApiKeyInsert,
	type ApiKeySelect,
	apiKeyRepository,
	type EventInsert,
	type EventSelect,
	eventRepository,
	type FeatureInsightInsert,
	type FeatureInsightSelect,
	featureInsightRepository,
	type FeatureMetricInsert,
	type FeatureMetricSelect,
	featureMetricRepository,
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
