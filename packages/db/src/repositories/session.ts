import { eq, inArray, sql } from "drizzle-orm";
import { db } from "../index";
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

	async create(
		data: Omit<AgentSessionInsert, "createdAt" | "updatedAt">,
	): Promise<AgentSessionSelect> {
		const rows = await db.insert(agentSession).values(data).returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to create session");
		}
		return row;
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
				output: sql`CASE WHEN ${agentSession.output} IS NULL THEN ${text} ELSE ${agentSession.output} || char(10) || ${text} END`,
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
		return session.completedAt.getTime() - session.startedAt.getTime();
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
