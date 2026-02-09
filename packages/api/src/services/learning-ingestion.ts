/**
 * Learning Ingestion Service
 *
 * Handles CLI fallback: when the server is down, the NOMOS CLI pipeline writes
 * learning data to .nomos/learning/pending.json. On server startup, this service
 * reads and ingests those pending entries, then archives the file.
 */
import { existsSync, readFileSync, renameSync } from "node:fs";
import { resolve } from "node:path";
import {
	antipatternRepository,
	featureInsightRepository,
	featureMetricRepository,
	patternRepository,
} from "@nomos-ai/db";
import { logger as rootLogger } from "../lib/logger";

const logger = rootLogger.child({ service: "learning-ingestion" });

interface PendingEntry {
	type: "pattern" | "antipattern" | "insight" | "metric";
	data: Record<string, unknown>;
}

interface PendingFile {
	entries: PendingEntry[];
	createdAt?: string;
}

export async function ingestPendingLearnings(
	projectRoot?: string,
): Promise<{ ingested: number; errors: number }> {
	const root = projectRoot ?? resolve(process.cwd());
	const pendingPath = resolve(root, ".nomos/learning/pending.json");

	if (!existsSync(pendingPath)) {
		return { ingested: 0, errors: 0 };
	}

	logger.info({ path: pendingPath }, "Found pending learnings file");

	let pending: PendingFile;
	try {
		pending = JSON.parse(readFileSync(pendingPath, "utf-8")) as PendingFile;
	} catch (error) {
		logger.error({ err: error }, "Failed to parse pending.json");
		return { ingested: 0, errors: 1 };
	}

	if (!pending.entries || pending.entries.length === 0) {
		logger.info("No pending entries to ingest");
		return { ingested: 0, errors: 0 };
	}

	let ingested = 0;
	let errors = 0;

	for (const entry of pending.entries) {
		try {
			switch (entry.type) {
				case "pattern":
					await patternRepository.upsert({
						id: entry.data.id as string,
						userId: (entry.data.userId as string) ?? "system",
						name: entry.data.name as string,
						description: entry.data.description as string,
						category: entry.data.category as string,
						confidence: entry.data.confidence as number,
						evidenceCount: entry.data.evidenceCount as number,
						successRate: entry.data.successRate as number,
						riskIfIgnored: entry.data.riskIfIgnored as string,
						codeExample: entry.data.codeExample as string,
						recommendation: entry.data.recommendation as string,
						appliesTo: entry.data.appliesTo as string[],
						featuresApplied: entry.data.featuresApplied as string[],
						featuresSucceeded: entry.data.featuresSucceeded as string[],
						firstSeen: entry.data.firstSeen as string,
						lastSeen: entry.data.lastSeen as string,
						status: "active",
					});
					break;

				case "antipattern":
					await antipatternRepository.upsert({
						id: entry.data.id as string,
						userId: (entry.data.userId as string) ?? "system",
						name: entry.data.name as string,
						description: entry.data.description as string,
						category: entry.data.category as string,
						severity: entry.data.severity as string,
						evidenceCount: entry.data.evidenceCount as number,
						prevention: entry.data.prevention as string,
						whatWentWrong: entry.data.whatWentWrong as string,
						lesson: entry.data.lesson as string,
						fixApplied: entry.data.fixApplied as string,
						lastSeen: entry.data.lastSeen as string,
					});
					break;

				case "insight":
					await featureInsightRepository.upsert({
						id: entry.data.id as string,
						userId: (entry.data.userId as string) ?? "system",
						featureId: entry.data.featureId as string,
						acceptanceCriteria: entry.data.acceptanceCriteria as Array<{
							criterion: string;
							status: string;
							details?: string;
						}>,
						discoveries: entry.data.discoveries as Array<{
							discovery: string;
							context: string;
							lesson: string;
							benefit?: string;
							code_pattern?: string;
						}>,
						patternsApplied: entry.data.patternsApplied as string[],
						whatWorked: entry.data.whatWorked as string[],
						whatFailed: entry.data.whatFailed as string[],
						whatCouldImprove: entry.data.whatCouldImprove as string[],
						recommendations: entry.data.recommendations as string[],
					});
					break;

				case "metric":
					await featureMetricRepository.upsert({
						id: entry.data.id as string,
						userId: (entry.data.userId as string) ?? "system",
						featureId: entry.data.featureId as string,
						durationMinutes: entry.data.durationMinutes as number,
						filesChanged: entry.data.filesChanged as number,
						linesAdded: entry.data.linesAdded as number,
						linesRemoved: entry.data.linesRemoved as number,
						commits: entry.data.commits as number,
						retries: entry.data.retries as number,
						riskLevel: entry.data.riskLevel as string,
						outcome: entry.data.outcome as string,
						startedAt: entry.data.startedAt
							? new Date(entry.data.startedAt as string)
							: undefined,
						verifiedAt: entry.data.verifiedAt
							? new Date(entry.data.verifiedAt as string)
							: undefined,
						notes: entry.data.notes as string,
					});
					break;

				default:
					logger.warn({ type: entry.type }, "Unknown pending entry type");
					errors++;
					continue;
			}
			ingested++;
		} catch (error) {
			logger.error(
				{ err: error, type: entry.type, id: entry.data.id },
				"Failed to ingest pending entry",
			);
			errors++;
		}
	}

	// Archive the processed file
	try {
		const archivePath = `${pendingPath}.processed`;
		renameSync(pendingPath, archivePath);
		logger.info({ archivePath }, "Archived processed pending file");
	} catch (error) {
		logger.error({ err: error }, "Failed to archive pending.json");
	}

	logger.info({ ingested, errors }, "Pending learnings ingestion complete");
	return { ingested, errors };
}
