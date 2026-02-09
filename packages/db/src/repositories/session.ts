import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../index";
import { createWithId } from "../lib/id-generation";
import { agentSession } from "../schema/sessions";

type AgentSessionSelect = typeof agentSession.$inferSelect;
type AgentSessionInsert = typeof agentSession.$inferInsert;

export const sessionRepository = {
	async findAll(): Promise<AgentSessionSelect[]> {
		return db.select().from(agentSession);
	},

	async findById(id: string): Promise<AgentSessionSelect | null> {
		const rows = await db
			.select()
			.from(agentSession)
			.where(eq(agentSession.id, id));
		return rows[0] ?? null;
	},

	async findByFeature(featureId: string): Promise<AgentSessionSelect[]> {
		return db
			.select()
			.from(agentSession)
			.where(eq(agentSession.featureId, featureId));
	},

	async findByStatus(status: string): Promise<AgentSessionSelect[]> {
		return db
			.select()
			.from(agentSession)
			.where(eq(agentSession.status, status));
	},

	async findActive(): Promise<AgentSessionSelect[]> {
		return db
			.select()
			.from(agentSession)
			.where(inArray(agentSession.status, ["pending", "running"]));
	},

	/** Find failed sessions that have an SDK session ID and feature ID, eligible for resume */
	async findResumable(): Promise<AgentSessionSelect[]> {
		return db
			.select()
			.from(agentSession)
			.where(eq(agentSession.status, "failed"));
	},

	async create(
		data: Omit<AgentSessionInsert, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		},
	): Promise<AgentSessionSelect> {
		if (data.id) {
			const rows = await db
				.insert(agentSession)
				.values({ ...data, id: data.id })
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create session");
			return row;
		}
		return db.transaction(async (tx) => {
			return createWithId(
				tx,
				agentSession,
				"S",
				3,
				data,
			) as Promise<AgentSessionSelect>;
		});
	},

	async update(
		id: string,
		data: Partial<Omit<AgentSessionInsert, "id" | "createdAt" | "updatedAt">>,
	): Promise<AgentSessionSelect> {
		const rows = await db
			.update(agentSession)
			.set(data)
			.where(eq(agentSession.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Session not found: ${id}`);
		}
		return row;
	},

	async appendOutput(id: string, text: string): Promise<AgentSessionSelect> {
		const rows = await db
			.update(agentSession)
			.set({
				output: sql`CASE WHEN ${agentSession.output} IS NULL THEN ${text} ELSE ${agentSession.output} || chr(10) || ${text} END`,
			})
			.where(eq(agentSession.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Session not found: ${id}`);
		}
		return row;
	},

	async delete(id: string): Promise<AgentSessionSelect> {
		const rows = await db
			.delete(agentSession)
			.where(eq(agentSession.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Session not found: ${id}`);
		}
		return row;
	},

	calculateDuration(session: AgentSessionSelect): number | null {
		if (!session.completedAt || !session.startedAt) {
			return null;
		}
		const end =
			session.completedAt instanceof Date
				? session.completedAt.getTime()
				: Number(session.completedAt);
		const start =
			session.startedAt instanceof Date
				? session.startedAt.getTime()
				: Number(session.startedAt);
		return end - start;
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
