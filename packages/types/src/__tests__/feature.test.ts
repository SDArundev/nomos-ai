import { describe, expect, it } from "bun:test";
import {
	BranchNameSchema,
	CategoryIdSchema,
	DescriptionHistoryEntrySchema,
	type Feature,
	FeatureAssetSchema,
	FeatureSchema,
	PhaseIdSchema,
	PlanSpecSchema,
	RequirementIdSchema,
} from "../feature";
import { FEATURE_STATUS } from "../status";

describe("Supporting Schemas", () => {
	describe("DescriptionHistoryEntrySchema", () => {
		it("accepts valid entry", () => {
			const result = DescriptionHistoryEntrySchema.safeParse({
				timestamp: "2026-01-27T12:00:00Z",
				source: "initial",
				content: "Initial description",
			});
			expect(result.success).toBe(true);
		});

		it("accepts entry with enhancementMode", () => {
			const result = DescriptionHistoryEntrySchema.safeParse({
				timestamp: "2026-01-27T12:00:00Z",
				source: "enhance",
				enhancementMode: "improve",
				content: "Enhanced description",
			});
			expect(result.success).toBe(true);
		});

		it("rejects invalid timestamp", () => {
			const result = DescriptionHistoryEntrySchema.safeParse({
				timestamp: "not-a-date",
				source: "initial",
				content: "Content",
			});
			expect(result.success).toBe(false);
		});
	});

	describe("FeatureAssetSchema", () => {
		it("accepts valid asset", () => {
			const result = FeatureAssetSchema.safeParse({
				id: "asset-1",
				path: "/path/to/file",
				filename: "file.png",
			});
			expect(result.success).toBe(true);
		});

		it("accepts asset with optional fields", () => {
			const result = FeatureAssetSchema.safeParse({
				id: "asset-1",
				path: "/path/to/file",
				filename: "file.png",
				mimeType: "image/png",
				content: "base64content",
			});
			expect(result.success).toBe(true);
		});
	});

	describe("CategoryIdSchema", () => {
		it("accepts valid CAT-XXX format", () => {
			const valid = ["CAT-PRJ", "CAT-AUT", "CAT-API"];
			for (const id of valid) {
				const result = CategoryIdSchema.safeParse(id);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid formats", () => {
			const invalid = ["CAT-PR", "CAT-PRJX", "cat-prj", "PRJ"];
			for (const id of invalid) {
				const result = CategoryIdSchema.safeParse(id);
				expect(result.success).toBe(false);
			}
		});
	});

	describe("PhaseIdSchema", () => {
		it("accepts valid phase-N format", () => {
			const valid = ["phase-1", "phase-2", "phase-10", "phase-99"];
			for (const id of valid) {
				const result = PhaseIdSchema.safeParse(id);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid formats", () => {
			const invalid = ["phase-", "phase-a", "Phase-1", "1"];
			for (const id of invalid) {
				const result = PhaseIdSchema.safeParse(id);
				expect(result.success).toBe(false);
			}
		});
	});

	describe("RequirementIdSchema", () => {
		it("accepts valid REQ-FXXX format", () => {
			const valid = ["REQ-F001", "REQ-F999", "REQ-NF001"];
			for (const id of valid) {
				const result = RequirementIdSchema.safeParse(id);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid formats", () => {
			const invalid = ["REQ-F1", "REQ-X001", "F001"];
			for (const id of invalid) {
				const result = RequirementIdSchema.safeParse(id);
				expect(result.success).toBe(false);
			}
		});
	});

	describe("BranchNameSchema", () => {
		it("accepts valid nomos/FXXX format", () => {
			const valid = ["nomos/F001", "nomos/F123", "nomos/F999"];
			for (const name of valid) {
				const result = BranchNameSchema.safeParse(name);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid formats", () => {
			const invalid = ["nomos/F1", "feature/F001", "nomos-F001"];
			for (const name of invalid) {
				const result = BranchNameSchema.safeParse(name);
				expect(result.success).toBe(false);
			}
		});
	});
});

describe("FeatureSchema", () => {
	const minimalValidFeature = {
		id: "F001",
		title: "Valid feature title here",
		category: "CAT-PRJ",
		description:
			"This is a valid description that meets the minimum length requirement",
		phase: "phase-1",
		acceptanceCriteria: ["At least one criterion"],
		status: "backlog",
		passes: false,
	};

	describe("required fields", () => {
		it("accepts minimal valid feature", () => {
			const result = FeatureSchema.safeParse(minimalValidFeature);
			expect(result.success).toBe(true);
		});

		it("rejects missing id", () => {
			const { id, ...noId } = minimalValidFeature;
			const result = FeatureSchema.safeParse(noId);
			expect(result.success).toBe(false);
		});

		it("rejects invalid id format", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				id: "invalid-id",
			});
			expect(result.success).toBe(false);
		});

		it("rejects title too short", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				title: "Hi",
			});
			expect(result.success).toBe(false);
		});

		it("rejects title too long", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				title: "x".repeat(81),
			});
			expect(result.success).toBe(false);
		});

		it("rejects description too short", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				description: "Too short",
			});
			expect(result.success).toBe(false);
		});

		it("rejects empty acceptanceCriteria", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				acceptanceCriteria: [],
			});
			expect(result.success).toBe(false);
		});

		it("rejects too many acceptanceCriteria", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				acceptanceCriteria: Array(11).fill("criterion"),
			});
			expect(result.success).toBe(false);
		});
	});

	describe("optional fields", () => {
		it("accepts all optional fields", () => {
			const fullFeature = {
				...minimalValidFeature,
				priority: 1,
				requirements: ["REQ-F001"],
				dependencies: ["F002"],
				spec: "Detailed spec",
				technicalNotes: "Technical notes",
				testingRequirements: {
					unit: ["test 1"],
					integration: ["test 2"],
				},
				files: {
					create: ["file1.ts"],
					modify: ["file2.ts"],
				},
				estimatedSize: "M",
				model: "sonnet",
				thinkingLevel: "standard",
				planningMode: "lite",
				requirePlanApproval: false,
				branchName: "nomos/F001",
				skipTests: false,
				tags: ["tag1", "tag2"],
				startedAt: "2026-01-27T12:00:00Z",
				retries: 0,
			};
			const result = FeatureSchema.safeParse(fullFeature);
			expect(result.success).toBe(true);
		});

		it("validates dependency format", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				dependencies: ["invalid"],
			});
			expect(result.success).toBe(false);
		});

		it("validates requirement format", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				requirements: ["invalid"],
			});
			expect(result.success).toBe(false);
		});
	});

	describe("status values", () => {
		it("accepts all valid status values", () => {
			const statuses = Object.values(FEATURE_STATUS);
			for (const status of statuses) {
				const result = FeatureSchema.safeParse({
					...minimalValidFeature,
					status,
				});
				expect(result.success).toBe(true);
			}
		});
	});

	describe("type inference", () => {
		it("infers Feature type correctly", () => {
			const parsed = FeatureSchema.parse(minimalValidFeature);
			const _typed: Feature = parsed;
			expect(parsed.id).toBe("F001");
		});
	});

	describe("default values", () => {
		it("applies default model value when not provided", () => {
			const result = FeatureSchema.safeParse(minimalValidFeature);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.model).toBe("sonnet");
			}
		});

		it("applies default thinkingLevel when not provided", () => {
			const result = FeatureSchema.safeParse(minimalValidFeature);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.thinkingLevel).toBe("standard");
			}
		});

		it("applies default planningMode when not provided", () => {
			const result = FeatureSchema.safeParse(minimalValidFeature);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.planningMode).toBe("lite");
			}
		});

		it("applies default skipTests when not provided", () => {
			const result = FeatureSchema.safeParse(minimalValidFeature);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.skipTests).toBe(false);
			}
		});

		it("applies default retries when not provided", () => {
			const result = FeatureSchema.safeParse(minimalValidFeature);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.retries).toBe(0);
			}
		});

		it("allows overriding default values", () => {
			const result = FeatureSchema.safeParse({
				...minimalValidFeature,
				model: "opus",
				thinkingLevel: "extended",
				planningMode: "full",
			});
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.model).toBe("opus");
				expect(result.data.thinkingLevel).toBe("extended");
				expect(result.data.planningMode).toBe("full");
			}
		});
	});
});

describe("PlanSpecSchema", () => {
	it("accepts minimal valid plan spec", () => {
		const result = PlanSpecSchema.safeParse({
			status: "pending",
		});
		expect(result.success).toBe(true);
	});

	it("accepts complete plan spec", () => {
		const result = PlanSpecSchema.safeParse({
			status: "approved",
			content: "## Plan\nDetailed plan content",
			version: 2,
			createdAt: "2026-01-27T12:00:00Z",
			updatedAt: "2026-01-27T13:00:00Z",
			taskCounts: {
				total: 10,
				completed: 5,
			},
		});
		expect(result.success).toBe(true);
	});

	it("rejects invalid status", () => {
		const result = PlanSpecSchema.safeParse({
			status: "invalid-status",
		});
		expect(result.success).toBe(false);
	});

	it("accepts all valid plan statuses", () => {
		const statuses = [
			"pending",
			"generating",
			"generated",
			"approved",
			"rejected",
		];
		for (const status of statuses) {
			const result = PlanSpecSchema.safeParse({ status });
			expect(result.success).toBe(true);
		}
	});
});
