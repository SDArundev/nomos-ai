import { db, sql } from "@nomos-ai/db";
import { feature } from "@nomos-ai/db/schema/features";
import { learning } from "@nomos-ai/db/schema/learnings";
import { project } from "@nomos-ai/db/schema/projects";
import { agentSession } from "@nomos-ai/db/schema/sessions";

async function getNextId(
	table:
		| typeof feature
		| typeof project
		| typeof agentSession
		| typeof learning,
	prefix: string,
): Promise<string> {
	const maxRetries = 3;
	let attempt = 0;

	while (attempt < maxRetries) {
		try {
			return await db.transaction(async (tx) => {
				const result = await tx
					.select({ maxId: sql<string>`MAX(${table.id})` })
					.from(table);
				const maxId = result[0]?.maxId;
				if (!maxId) {
					return `${prefix}001`;
				}
				const num = Number.parseInt(maxId.slice(prefix.length), 10);
				return `${prefix}${String(num + 1).padStart(3, "0")}`;
			});
		} catch (error) {
			attempt++;
			const isConstraintViolation =
				error instanceof Error &&
				(error.message.includes("UNIQUE constraint") ||
					error.message.includes("SQLITE_CONSTRAINT"));
			if (!isConstraintViolation || attempt >= maxRetries) {
				throw error;
			}
			// Brief delay before retry to reduce contention
			await new Promise((resolve) => setTimeout(resolve, 10 * attempt));
		}
	}

	// Unreachable — loop always returns or throws — but satisfies TypeScript
	throw new Error("Failed to generate ID after maximum retries");
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
