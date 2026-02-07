import { featureRepository } from "@nomos-ai/db";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { generateFeatureId } from "../utils/id-generation";
import { SpecService } from "../services/spec-service";

let specServiceInstance: SpecService | null = null;

function getSpecService(): SpecService {
	if (!specServiceInstance) {
		specServiceInstance = new SpecService();
	}
	return specServiceInstance;
}

export const specRouter = {
	getSpec: protectedProcedure
		.input(z.object({ projectPath: z.string() }))
		.handler(async ({ input }) => {
			const service = getSpecService();
			const spec = await service.loadSpec(input.projectPath);
			if (!spec) return { spec: null, validation: { valid: false, errors: [{ path: "", message: "No spec found" }] } };
			const validation = service.validate(spec as unknown as Record<string, unknown>);
			return { spec, validation };
		}),

	updateSpec: protectedProcedure
		.input(
			z.object({
				projectPath: z.string(),
				spec: z.record(z.string(), z.unknown()),
			}),
		)
		.handler(async ({ input }) => {
			const service = getSpecService();
			const validation = service.validate(input.spec as Record<string, unknown>);
			if (!validation.valid) {
				return { success: false, errors: validation.errors };
			}
			await service.saveSpec(
				input.projectPath,
				input.spec as unknown as Parameters<SpecService["saveSpec"]>[1],
			);
			return { success: true, errors: [] as { path: string; message: string }[] };
		}),

	extractFeatures: protectedProcedure
		.input(
			z.object({
				projectPath: z.string(),
				projectId: z.string(),
				createInDb: z.boolean().default(false),
			}),
		)
		.handler(async ({ input, context }) => {
			const service = getSpecService();
			const spec = await service.loadSpec(input.projectPath);
			if (!spec) {
				return { features: [], created: 0 };
			}

			const features = service.extractFeatures(
				spec,
				input.projectId,
				context.session.user.id,
			);

			if (input.createInDb && features.length > 0) {
				for (const f of features) {
					await featureRepository.create({
						...f,
						id: await generateFeatureId(),
					});
				}
			}

			return {
				features,
				created: input.createInDb ? features.length : 0,
			};
		}),
};
