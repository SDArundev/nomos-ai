import { createClient } from "@libsql/client";
import { env } from "@nomos-ai/env/server";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
	url: env.DATABASE_URL,
});

export const db = drizzle({ client, schema });

export { sql } from "drizzle-orm";
export { runMigrations } from "./migrate";
export {
	type FeatureInsert,
	type FeatureSelect,
	featureRepository,
	type LearningInsert,
	type LearningSelect,
	learningRepository,
	projectRepository,
	sessionRepository,
} from "./repositories";
