/**
 * Seed script — reads .nomos/learning/ JSON files and inserts into Postgres.
 *
 * Usage:
 *   bun run packages/db/src/scripts/seed-learnings.ts
 *
 * Prerequisites:
 *   - Postgres running (docker compose up -d postgres)
 *   - DATABASE_URL set in .env
 *   - Migrations applied (bun run db:migrate)
 *   - Features seeded (bun run packages/db/src/scripts/seed.ts)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { antipattern } from "../schema/antipatterns";
import { featureInsight } from "../schema/feature-insights";
import { featureMetric } from "../schema/feature-metrics";
import { feature } from "../schema/features";
import { pattern } from "../schema/patterns";

const SYSTEM_USER_ID = "system";

function readJsonFile<T>(path: string): T | null {
	if (!existsSync(path)) {
		console.log(`  Skipping (not found): ${path}`);
		return null;
	}
	return JSON.parse(readFileSync(path, "utf-8")) as T;
}

async function featureExists(featureId: string): Promise<boolean> {
	const rows = await db
		.select({ id: feature.id })
		.from(feature)
		.where(eq(feature.id, featureId))
		.limit(1);
	return rows.length > 0;
}

async function seedPatterns(monorepoRoot: string) {
	const path = resolve(monorepoRoot, ".nomos/learning/patterns.json");
	const data = readJsonFile<{ patterns: Record<string, unknown>[] }>(path);
	if (!data?.patterns) return { inserted: 0, skipped: 0 };

	let inserted = 0;
	let skipped = 0;

	for (const p of data.patterns) {
		const id = p.id as string;
		if (!id) {
			skipped++;
			continue;
		}

		const existing = await db
			.select({ id: pattern.id })
			.from(pattern)
			.where(eq(pattern.id, id))
			.limit(1);

		if (existing[0]) {
			skipped++;
			continue;
		}

		await db.insert(pattern).values({
			id,
			userId: SYSTEM_USER_ID,
			name: (p.name as string) ?? id,
			description: (p.description as string) ?? "",
			category: (p.category as string) ?? "infra",
			confidence: (p.confidence as number) ?? 0.5,
			evidenceCount: (p.evidence_count as number) ?? 0,
			successRate: (p.success_rate as number) ?? 0,
			riskIfIgnored: (p.risk_if_ignored as string) ?? null,
			codeExample:
				(p.code_example as string) ?? (p.codeExample as string) ?? null,
			recommendation: (p.recommendation as string) ?? null,
			appliesTo: (p.applies_to as string[]) ?? null,
			featuresApplied: (p.features_applied as string[]) ?? null,
			featuresSucceeded: (p.features_succeeded as string[]) ?? null,
			firstSeen: (p.first_seen as string) ?? null,
			lastSeen: (p.last_seen as string) ?? null,
			status: "active",
		});
		inserted++;
	}

	return { inserted, skipped };
}

async function seedAntipatterns(monorepoRoot: string) {
	const path = resolve(monorepoRoot, ".nomos/learning/antipatterns.json");
	const data = readJsonFile<{ antipatterns: Record<string, unknown>[] }>(path);
	if (!data?.antipatterns) return { inserted: 0, skipped: 0 };

	let inserted = 0;
	let skipped = 0;

	for (const ap of data.antipatterns) {
		const id = ap.id as string;
		if (!id) {
			skipped++;
			continue;
		}

		const existing = await db
			.select({ id: antipattern.id })
			.from(antipattern)
			.where(eq(antipattern.id, id))
			.limit(1);

		if (existing[0]) {
			skipped++;
			continue;
		}

		await db.insert(antipattern).values({
			id,
			userId: SYSTEM_USER_ID,
			name: (ap.name as string) ?? id,
			description: (ap.description as string) ?? "",
			category: (ap.category as string) ?? "infra",
			severity: (ap.severity as string) ?? "MEDIUM",
			evidenceCount: (ap.evidence_count as number) ?? 0,
			prevention: (ap.prevention as string) ?? null,
			whatWentWrong: (ap.what_went_wrong as string) ?? null,
			lesson: (ap.lesson as string) ?? null,
			fixApplied: (ap.fix_applied as string) ?? null,
			lastSeen: (ap.last_seen as string) ?? null,
		});
		inserted++;
	}

	return { inserted, skipped };
}

async function seedMetrics(monorepoRoot: string) {
	const path = resolve(monorepoRoot, ".nomos/learning/metrics.json");
	const data = readJsonFile<{
		features: Record<string, Record<string, unknown>>;
	}>(path);
	if (!data?.features) return { inserted: 0, skipped: 0 };

	let inserted = 0;
	let skipped = 0;

	for (const [featureId, m] of Object.entries(data.features)) {
		const exists = await featureExists(featureId);
		if (!exists) {
			skipped++;
			continue;
		}

		const existing = await db
			.select({ id: featureMetric.id })
			.from(featureMetric)
			.where(eq(featureMetric.featureId, featureId))
			.limit(1);

		if (existing[0]) {
			skipped++;
			continue;
		}

		const metricId = `MET-${featureId}`;

		await db.insert(featureMetric).values({
			id: metricId,
			userId: SYSTEM_USER_ID,
			featureId,
			durationMinutes: (m.duration_minutes as number) ?? null,
			filesChanged: (m.files_changed as number) ?? null,
			linesAdded: (m.lines_added as number) ?? null,
			linesRemoved: (m.lines_removed as number) ?? null,
			commits: (m.commits as number) ?? null,
			retries: (m.retries as number) ?? 0,
			riskLevel: (m.risk_level as string) ?? null,
			outcome: (m.outcome as string) ?? null,
			startedAt: m.started_at
				? new Date(m.started_at as string)
				: (m.start_ts ? new Date(m.start_ts as string) : null),
			verifiedAt: m.verified_at
				? new Date(m.verified_at as string)
				: (m.verify_ts ? new Date(m.verify_ts as string) : null),
			notes: (m.notes as string) ?? null,
		});
		inserted++;
	}

	return { inserted, skipped };
}

async function seedInsights(monorepoRoot: string) {
	const insightsDir = resolve(monorepoRoot, ".nomos/learning/insights");
	if (!existsSync(insightsDir)) {
		console.log("  Insights directory not found, skipping");
		return { inserted: 0, skipped: 0 };
	}

	const files = readdirSync(insightsDir).filter(
		(f) => f.endsWith(".json") && f.startsWith("F"),
	);

	let inserted = 0;
	let skipped = 0;

	for (const file of files) {
		const featureId = file.replace(".json", "");
		const exists = await featureExists(featureId);
		if (!exists) {
			skipped++;
			continue;
		}

		const existing = await db
			.select({ id: featureInsight.id })
			.from(featureInsight)
			.where(eq(featureInsight.featureId, featureId))
			.limit(1);

		if (existing[0]) {
			skipped++;
			continue;
		}

		const filePath = resolve(insightsDir, file);
		const data = readJsonFile<Record<string, unknown>>(filePath);
		if (!data) {
			skipped++;
			continue;
		}

		const insightId = `INS-${featureId}`;

		await db.insert(featureInsight).values({
			id: insightId,
			userId: SYSTEM_USER_ID,
			featureId,
			acceptanceCriteria:
				(data.acceptance_criteria as Array<{
					criterion: string;
					status: string;
					details?: string;
				}>) ?? null,
			discoveries:
				(data.discoveries as Array<{
					discovery: string;
					context: string;
					lesson: string;
					benefit?: string;
					code_pattern?: string;
				}>) ?? null,
			patternsApplied: (data.patterns_applied as string[]) ?? null,
			whatWorked: (data.what_worked as string[]) ?? null,
			whatFailed: (data.what_failed as string[]) ?? null,
			whatCouldImprove: (data.what_could_improve as string[]) ?? null,
			recommendations: Array.isArray(data.recommendations)
				? data.recommendations.map((r: unknown) =>
						typeof r === "string"
							? r
							: (r as Record<string, string>).recommendation ?? String(r),
					)
				: null,
		});
		inserted++;
	}

	return { inserted, skipped };
}

async function main() {
	const monorepoRoot = resolve(import.meta.dirname, "../../../..");
	console.log("=== Seed Learnings ===");
	console.log(`Monorepo root: ${monorepoRoot}\n`);

	console.log("1/4 Seeding patterns...");
	const patterns = await seedPatterns(monorepoRoot);
	console.log(
		`  Patterns: ${patterns.inserted} inserted, ${patterns.skipped} skipped\n`,
	);

	console.log("2/4 Seeding antipatterns...");
	const antipatterns = await seedAntipatterns(monorepoRoot);
	console.log(
		`  Antipatterns: ${antipatterns.inserted} inserted, ${antipatterns.skipped} skipped\n`,
	);

	console.log("3/4 Seeding metrics...");
	const metrics = await seedMetrics(monorepoRoot);
	console.log(
		`  Metrics: ${metrics.inserted} inserted, ${metrics.skipped} skipped\n`,
	);

	console.log("4/4 Seeding insights...");
	const insights = await seedInsights(monorepoRoot);
	console.log(
		`  Insights: ${insights.inserted} inserted, ${insights.skipped} skipped\n`,
	);

	console.log("=== Summary ===");
	console.log(`Patterns:     ${patterns.inserted} new`);
	console.log(`Antipatterns: ${antipatterns.inserted} new`);
	console.log(`Metrics:      ${metrics.inserted} new`);
	console.log(`Insights:     ${insights.inserted} new`);
	console.log(
		`Total:        ${patterns.inserted + antipatterns.inserted + metrics.inserted + insights.inserted} records`,
	);

	process.exit(0);
}

main().catch((err) => {
	console.error("Seed learnings failed:", err);
	process.exit(1);
});
