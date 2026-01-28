import { eq } from "drizzle-orm";
import { db } from "../index";
import { project } from "../schema/projects";

type ProjectSelect = typeof project.$inferSelect;
type ProjectInsert = typeof project.$inferInsert;

export const projectRepository = {
	async findAll(): Promise<ProjectSelect[]> {
		return db.select().from(project);
	},

	async findById(id: string): Promise<ProjectSelect | null> {
		const rows = await db.select().from(project).where(eq(project.id, id));
		return rows[0] ?? null;
	},

	async create(
		data: Omit<ProjectInsert, "createdAt" | "updatedAt">,
	): Promise<ProjectSelect> {
		const rows = await db.insert(project).values(data).returning();
		const row = rows[0];
		if (!row) {
			throw new Error("Failed to create project");
		}
		return row;
	},

	async update(
		id: string,
		data: Partial<Omit<ProjectInsert, "id" | "createdAt" | "updatedAt">>,
	): Promise<ProjectSelect> {
		const rows = await db
			.update(project)
			.set(data)
			.where(eq(project.id, id))
			.returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Project not found: ${id}`);
		}
		return row;
	},

	async delete(id: string): Promise<ProjectSelect> {
		const rows = await db.delete(project).where(eq(project.id, id)).returning();
		const row = rows[0];
		if (!row) {
			throw new Error(`Project not found: ${id}`);
		}
		return row;
	},

	async withTransaction<T>(
		fn: (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => Promise<T>,
	): Promise<T> {
		return db.transaction(fn);
	},
};
