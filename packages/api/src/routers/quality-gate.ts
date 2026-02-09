import { featureRepository, worktreeRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import {
	type QualityGateResult,
	QualityGateService,
	type TestGateResult,
} from "../services/quality-gate-service";

let qualityGateServiceInstance: QualityGateService | null = null;

export function getQualityGateService(): QualityGateService {
	if (!qualityGateServiceInstance) {
		qualityGateServiceInstance = new QualityGateService();
	}
	return qualityGateServiceInstance;
}

async function resolveWorktreePath(
	featureId: string,
	userId: string,
): Promise<string> {
	const feature = await featureRepository.findById(featureId);
	if (!feature || feature.userId !== userId) {
		throw new ORPCError("FORBIDDEN", { message: "Access denied" });
	}

	const wt = await worktreeRepository.findByFeatureId(featureId);
	if (!wt) {
		throw new ORPCError("NOT_FOUND", {
			message: `No active worktree for feature ${featureId}`,
		});
	}

	return wt.path;
}

const featureInput = z.object({ featureId: z.string().min(1) });

export const qualityGateRouter = {
	runTypeCheck: protectedProcedure
		.input(featureInput)
		.handler(async ({ input, context }): Promise<QualityGateResult> => {
			const worktreePath = await resolveWorktreePath(
				input.featureId,
				context.session.user.id,
			);
			const service = getQualityGateService();
			return service.runTypeCheck(worktreePath);
		}),

	runLint: protectedProcedure
		.input(featureInput)
		.handler(async ({ input, context }): Promise<QualityGateResult> => {
			const worktreePath = await resolveWorktreePath(
				input.featureId,
				context.session.user.id,
			);
			const service = getQualityGateService();
			return service.runLintCheck(worktreePath);
		}),

	runTests: protectedProcedure
		.input(featureInput)
		.handler(async ({ input, context }): Promise<TestGateResult> => {
			const worktreePath = await resolveWorktreePath(
				input.featureId,
				context.session.user.id,
			);
			const service = getQualityGateService();
			return service.runTests(worktreePath);
		}),

	runAll: protectedProcedure.input(featureInput).handler(
		async ({
			input,
			context,
		}): Promise<{
			typecheck: QualityGateResult;
			lint: QualityGateResult;
			test: TestGateResult;
			overallStatus: "PASS" | "FAIL";
		}> => {
			const worktreePath = await resolveWorktreePath(
				input.featureId,
				context.session.user.id,
			);
			const service = getQualityGateService();

			const [typecheck, lint, test] = await Promise.all([
				service.runTypeCheck(worktreePath),
				service.runLintCheck(worktreePath),
				service.runTests(worktreePath),
			]);

			const overallStatus =
				typecheck.status === "PASS" &&
				lint.status === "PASS" &&
				test.status === "PASS"
					? "PASS"
					: "FAIL";

			return { typecheck, lint, test, overallStatus };
		},
	),
};
