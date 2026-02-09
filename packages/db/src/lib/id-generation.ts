import { sql } from "drizzle-orm";
import { db } from "../index";
import { antipattern } from "../schema/antipatterns";
import { featureInsight } from "../schema/feature-insights";
import { featureMetric } from "../schema/feature-metrics";
import { feature } from "../schema/features";
import { learning } from "../schema/learnings";
import { pattern } from "../schema/patterns";
import { project } from "../schema/projects";
import { agentSession } from "../schema/sessions";

type TransactionType = Parameters<Parameters<typeof db.transaction>[0]>[0];

type SupportedTable =
	| typeof feature
	| typeof project
	| typeof agentSession
	| typeof learning
	| typeof pattern
	| typeof antipattern
	| typeof featureInsight
	| typeof featureMetric;

/**
 * Atomically generates an ID and inserts a record in a single transaction.
 * Replaces the two-step getNextId() + insert() pattern to prevent race conditions.
 */
export async function createWithId(
	tx: TransactionType,
	table: SupportedTable,
	prefix: string,
	padWidth: number,
	data: Record<string, unknown>,
): Promise<Record<string, unknown>> {
	const result = await tx
		.select({ maxId: sql<string>`MAX(${table.id})` })
		.from(table);
	const maxId = result[0]?.maxId;
	let id: string;
	if (!maxId) {
		id = `${prefix}${"1".padStart(padWidth, "0")}`;
	} else {
		const num = Number.parseInt(maxId.slice(prefix.length), 10);
		id = `${prefix}${String(num + 1).padStart(padWidth, "0")}`;
	}
	type InsertChain = {
		insert: (t: SupportedTable) => {
			values: (v: Record<string, unknown>) => {
				returning: () => Promise<Record<string, unknown>[]>;
			};
		};
	};
	const rows = await (tx as unknown as InsertChain)
		.insert(table)
		.values({ ...data, id })
		.returning();
	const row = rows[0];
	if (!row) {
		throw new Error("Failed to create record with atomic ID");
	}
	return row as Record<string, unknown>;
}

/**
 * @deprecated Use `createWithId()` instead for atomic ID generation within a transaction.
 */
async function getNextId(
	table:
		| typeof feature
		| typeof project
		| typeof agentSession
		| typeof learning
		| typeof pattern
		| typeof antipattern
		| typeof featureInsight
		| typeof featureMetric,
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
				(error.message.includes("unique constraint") ||
					error.message.includes("duplicate key") ||
					error.message.includes("UNIQUE constraint") ||
					error.message.includes("SQLITE_CONSTRAINT"));
			if (!isConstraintViolation || attempt >= maxRetries) {
				throw error;
			}
			await new Promise((resolve) => setTimeout(resolve, 10 * attempt));
		}
	}

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

export async function generatePatternId(): Promise<string> {
	return getNextId(pattern, "PAT-");
}

export async function generateAntipatternId(): Promise<string> {
	return getNextId(antipattern, "ANTI-");
}

export async function generateInsightId(): Promise<string> {
	return getNextId(featureInsight, "INS-");
}

export async function generateMetricId(): Promise<string> {
	return getNextId(featureMetric, "MET-");
}
