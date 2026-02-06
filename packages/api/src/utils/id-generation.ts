import { db, sql } from "@nomos-ai/db";
import { feature } from "@nomos-ai/db/schema/features";
import { learning } from "@nomos-ai/db/schema/learnings";
import { project } from "@nomos-ai/db/schema/projects";
import { agentSession } from "@nomos-ai/db/schema/sessions";

async function getNextId(
	table: typeof feature | typeof project | typeof agentSession | typeof learning,
	prefix: string,
): Promise<string> {
	const result = await db
		.select({ maxId: sql<string>`MAX(${table.id})` })
		.from(table);
	const maxId = result[0]?.maxId;
	if (!maxId) {
		return `${prefix}001`;
	}
	const num = Number.parseInt(maxId.slice(prefix.length), 10);
	return `${prefix}${String(num + 1).padStart(3, "0")}`;
}

export async function generateFeatureId(): Promise<string> {
	return getNextId(feature, "F");
}

export async function generateProjectId(): Promise<string> {
	return getNextId(project, "P");
}

export async function generateSessionId(): Promise<string> {
	return getNextId(agentSession, "S");
}

export async function generateLearningId(): Promise<string> {
	return getNextId(learning, "L");
}
