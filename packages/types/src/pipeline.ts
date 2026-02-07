import { z } from "zod";

export const pipelineStepIdSchema = z.enum([
	"init",
	"context",
	"plan",
	"execute",
	"verify",
	"merge",
	"finish",
]);
export type PipelineStepId = z.infer<typeof pipelineStepIdSchema>;

export const pipelineStepStatusSchema = z.enum([
	"pending",
	"running",
	"completed",
	"failed",
	"skipped",
]);
export type PipelineStepStatus = z.infer<typeof pipelineStepStatusSchema>;

export const pipelineStepSchema = z.object({
	id: pipelineStepIdSchema,
	name: z.string(),
	order: z.number(),
	status: pipelineStepStatusSchema.default("pending"),
	startedAt: z.date().optional(),
	completedAt: z.date().optional(),
	error: z.string().optional(),
});
export type PipelineStep = z.infer<typeof pipelineStepSchema>;
