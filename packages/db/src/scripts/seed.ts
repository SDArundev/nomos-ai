/**
 * Seed script — reads .nomos/features.json and inserts features into Postgres.
 *
 * Usage:
 *   bun run packages/db/src/scripts/seed.ts
 *
 * Prerequisites:
 *   - Postgres running (docker compose up -d postgres)
 *   - DATABASE_URL set in .env
 *   - Migrations applied (bun run db:migrate)
 *   - A user and project must exist in the DB (created via auth flow)
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { feature } from "../schema/features";
import { project } from "../schema/projects";
import { user } from "../schema/auth";

interface FeatureJson {
	id: string;
	title: string;
	category: string;
	description: string;
	phase: string;
	priority?: number;
	requirements?: string[];
	dependencies?: string[];
	acceptanceCriteria: string[];
	estimatedSize?: string;
	status: string;
	passes?: boolean;
	model?: string;
	thinkingLevel?: string;
	planningMode?: string;
	requirePlanApproval?: boolean;
	skipTests?: boolean;
	preImplemented?: boolean;
	tags?: string[];
	release?: string;
	restoredAt?: string;
	failureReason?: string;
	spec?: string;
	technicalNotes?: string;
	testingRequirements?: {
		unit?: string[];
		integration?: string[];
		e2e?: string[];
		manual?: string[];
	};
	files?: {
		create?: string[];
		modify?: string[];
		delete?: string[];
	};
}

async function seed() {
	const monorepoRoot = resolve(import.meta.dirname, "../../../..");
	const featuresPath = resolve(monorepoRoot, ".nomos/features.json");

	console.log(`Reading features from: ${featuresPath}`);
	const raw = readFileSync(featuresPath, "utf-8");
	const data = JSON.parse(raw);
	const features: FeatureJson[] = data.features ?? [];

	console.log(`Found ${features.length} features to seed`);

	// Get or create bootstrap user
	let users = await db.select().from(user).limit(1);
	if (!users[0]) {
		console.log("No user found — creating bootstrap user...");
		const now = new Date();
		await db.insert(user).values({
			id: "seed-user-001",
			name: "NOMOS Admin",
			email: "admin@nomos.local",
			emailVerified: false,
			createdAt: now,
			updatedAt: now,
		});
		users = await db.select().from(user).limit(1);
	}
	const userId = users[0]!.id;

	// Get or create bootstrap project
	let projects = await db
		.select()
		.from(project)
		.where(eq(project.userId, userId))
		.limit(1);
	if (!projects[0]) {
		console.log("No project found — creating bootstrap project...");
		const now = new Date();
		await db.insert(project).values({
			id: "nomos-ai",
			userId,
			name: "nomos-ai",
			path: monorepoRoot,
			status: "active",
			createdAt: now,
			updatedAt: now,
		});
		projects = await db
			.select()
			.from(project)
			.where(eq(project.userId, userId))
			.limit(1);
	}
	const projectId = projects[0]!.id;

	console.log(`Seeding as user=${userId}, project=${projectId}`);

	let inserted = 0;
	let skipped = 0;

	for (const f of features) {
		// Check if feature already exists
		const existing = await db
			.select({ id: feature.id })
			.from(feature)
			.where(eq(feature.id, f.id))
			.limit(1);

		if (existing[0]) {
			skipped++;
			continue;
		}

		await db.insert(feature).values({
			id: f.id,
			userId,
			projectId,
			title: f.title,
			category: f.category,
			description: f.description,
			phase: f.phase || "phase-1",
			priority: f.priority ?? null,
			status: f.status,
			passes: f.passes ?? false,
			acceptanceCriteria: f.acceptanceCriteria,
			requirements: f.requirements ?? null,
			dependencies: f.dependencies ?? null,
			estimatedSize: f.estimatedSize ?? null,
			preImplemented: f.preImplemented ?? null,
			model: f.model ?? null,
			thinkingLevel: f.thinkingLevel ?? null,
			planningMode: f.planningMode ?? null,
			requirePlanApproval: f.requirePlanApproval ?? null,
			skipTests: f.skipTests ?? null,
			tags: f.tags ?? null,
			release: f.release ?? null,
			failureReason: f.failureReason ?? null,
			restoredAt: f.restoredAt ? new Date(f.restoredAt) : null,
			spec: f.spec ?? null,
			technicalNotes: f.technicalNotes ?? null,
			testingRequirements: f.testingRequirements ?? null,
			files: f.files ?? null,
		});
		inserted++;
	}

	console.log(`Seed complete: ${inserted} inserted, ${skipped} skipped (already exist)`);
	process.exit(0);
}

seed().catch((err) => {
	console.error("Seed failed:", err);
	process.exit(1);
});
