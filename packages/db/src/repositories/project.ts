import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { createWithId } from "../lib/id-generation";
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

	async findByUser(userId: string): Promise<ProjectSelect[]> {
		return db.select().from(project).where(eq(project.userId, userId));
	},

	async findByPath(
		userId: string,
		path: string,
	): Promise<ProjectSelect | null> {
		const rows = await db
			.select()
			.from(project)
			.where(and(eq(project.userId, userId), eq(project.path, path)));
		return rows[0] ?? null;
	},

	async create(
		data: Omit<ProjectInsert, "id" | "createdAt" | "updatedAt"> & {
			id?: string;
		},
	): Promise<ProjectSelect> {
		if (data.id) {
			const rows = await db
				.insert(project)
				.values({ ...data, id: data.id })
				.returning();
			const row = rows[0];
			if (!row) throw new Error("Failed to create project");
			return row;
		}
		return db.transaction(async (tx) => {
			return createWithId(tx, project, "P", 3, data) as Promise<ProjectSelect>;
		});
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
