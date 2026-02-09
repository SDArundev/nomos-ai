import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { FeatureSelect } from "@nomos-ai/db";
import { MODEL, SESSION_STATUS } from "@nomos-ai/types";

// Mock dependencies BEFORE importing the module under test
const mockFeatureRepository = {
	findById: mock(() => Promise.resolve(null)),
};

const mockSessionRepository = {
	create: mock(() => Promise.resolve(null)),
};

const mockGenerateSessionId = mock(() => Promise.resolve("S001"));

const mockMessageRepository = {};

mock.module("@nomos-ai/db", () => ({
	featureRepository: mockFeatureRepository,
	sessionRepository: mockSessionRepository,
	messageRepository: mockMessageRepository,
}));

mock.module("../utils/id-generation", () => ({
	generateSessionId: mockGenerateSessionId,
}));

// Now import after mocks are set up
const { buildSystemPrompt, configureTools, createAgentSession } = await import(
	"./agent-service"
);

const { MODEL_MAP } = await import("@nomos-ai/types");

describe("agent-service", () => {
	beforeEach(() => {
		mockFeatureRepository.findById.mockClear();
		mockSessionRepository.create.mockClear();
		mockGenerateSessionId.mockClear();
	});

	describe("MODEL_MAP constant", () => {
		test("has entries for all Model enum values", () => {
			expect(MODEL_MAP).toHaveProperty("opus");
			expect(MODEL_MAP).toHaveProperty("sonnet");
			expect(MODEL_MAP).toHaveProperty("haiku");
			expect(MODEL_MAP.opus).toBe("claude-opus-4-20250514");
			expect(MODEL_MAP.sonnet).toBe("claude-sonnet-4-5-20250929");
			expect(MODEL_MAP.haiku).toBe("claude-haiku-4-5-20251001");
		});

		test("MODEL enum values match MODEL_MAP keys", () => {
			expect(MODEL_MAP[MODEL.OPUS]).toBeDefined();
			expect(MODEL_MAP[MODEL.SONNET]).toBeDefined();
			expect(MODEL_MAP[MODEL.HAIKU]).toBeDefined();
		});
	});

	describe("buildSystemPrompt", () => {
		test("builds prompt with title, description, and acceptance criteria", () => {
			const mockFeature: FeatureSelect = {
				id: "F001",
				title: "Test Feature",
				description: "Test description for the feature",
				acceptanceCriteria: ["AC1: First criterion", "AC2: Second criterion"],
				spec: null,
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: null,
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const prompt = buildSystemPrompt(mockFeature);

			expect(prompt).toContain("# Feature Implementation: F001");
			expect(prompt).toContain("Test Feature");
			expect(prompt).toContain("Test description");
			expect(prompt).toContain("1. AC1: First criterion");
			expect(prompt).toContain("2. AC2: Second criterion");
		});

		test("includes spec when present", () => {
			const mockFeature: FeatureSelect = {
				id: "F002",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: "Detailed specification",
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: null,
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const prompt = buildSystemPrompt(mockFeature);

			expect(prompt).toContain("## Specification");
			expect(prompt).toContain("Detailed specification");
		});

		test("includes technical notes when present", () => {
			const mockFeature: FeatureSelect = {
				id: "F003",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: null,
				technicalNotes: "Important technical notes",
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: null,
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const prompt = buildSystemPrompt(mockFeature);

			expect(prompt).toContain("## Technical Notes");
			expect(prompt).toContain("Important technical notes");
		});

		test("includes testing requirements when present", () => {
			const mockFeature: FeatureSelect = {
				id: "F004",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: null,
				technicalNotes: null,
				testingRequirements: {
					unit: ["Test user creation"],
					integration: ["Test API endpoint"],
				},
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: null,
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const prompt = buildSystemPrompt(mockFeature);

			expect(prompt).toContain("## Testing Requirements");
			expect(prompt).toContain("### Unit Tests");
			expect(prompt).toContain("- Test user creation");
			expect(prompt).toContain("### Integration Tests");
			expect(prompt).toContain("- Test API endpoint");
		});

		test("handles missing optional fields", () => {
			const mockFeature: FeatureSelect = {
				id: "F005",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: null,
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: null,
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const prompt = buildSystemPrompt(mockFeature);

			expect(prompt).not.toContain("## Specification");
			expect(prompt).not.toContain("## Technical Notes");
			expect(prompt).not.toContain("## Testing Requirements");
		});

		test("filters out null/undefined values in acceptance criteria", () => {
			const mockFeature: FeatureSelect = {
				id: "F006",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: [
					"AC1: Valid criterion",
					null,
					"AC2: Another valid",
					undefined,
				],
				spec: null,
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: null,
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const prompt = buildSystemPrompt(mockFeature);

			expect(prompt).toContain("1. AC1: Valid criterion");
			expect(prompt).toContain("2. AC2: Another valid");
			// Only 2 items should be numbered
			expect(prompt).not.toContain("3.");
		});
	});

	describe("configureTools", () => {
		test("returns DEFAULT_TOOLS when no overrides provided", () => {
			const tools = configureTools();
			expect(tools).toEqual(["Read", "Write", "Edit", "Bash", "Glob", "Grep"]);
		});

		test("returns override tools when provided", () => {
			const overrides = ["Read", "Write"];
			const tools = configureTools(overrides);
			expect(tools).toEqual(["Read", "Write"]);
		});

		test("returns empty array if override is empty", () => {
			const overrides: string[] = [];
			const tools = configureTools(overrides);
			expect(tools).toEqual([]);
		});
	});

	describe("createAgentSession", () => {
		test("throws NOT_FOUND when feature does not exist", async () => {
			mockFeatureRepository.findById.mockResolvedValueOnce(null);

			await expect(
				createAgentSession({
					featureId: "F999",
					userId: "user_001",
				}),
			).rejects.toThrow("Feature not found: F999");
		});

		test("creates session with default settings", async () => {
			const mockFeature: FeatureSelect = {
				id: "F010",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: null,
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: null,
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mockSession = {
				id: "S001",
				userId: "user_001",
				featureId: "F010",
				status: SESSION_STATUS.PENDING,
				startedAt: new Date(),
			};

			mockFeatureRepository.findById.mockResolvedValueOnce(mockFeature);
			mockSessionRepository.create.mockResolvedValueOnce(mockSession);
			mockGenerateSessionId.mockResolvedValueOnce("S001");

			const result = await createAgentSession({
				featureId: "F010",
				userId: "user_001",
			});

			expect(result.session).toEqual(mockSession);
			expect(result.agentConfig.model).toBe(MODEL_MAP.sonnet); // default
			expect(result.agentConfig.tools).toEqual([
				"Read",
				"Write",
				"Edit",
				"Bash",
				"Glob",
				"Grep",
			]);
			expect(result.agentConfig.permissionMode).toBe("default");
		});

		test("uses feature model when valid", async () => {
			const mockFeature: FeatureSelect = {
				id: "F011",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: null,
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: "opus", // Valid model
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mockSession = {
				id: "S002",
				userId: "user_001",
				featureId: "F011",
				status: SESSION_STATUS.PENDING,
				startedAt: new Date(),
			};

			mockFeatureRepository.findById.mockResolvedValueOnce(mockFeature);
			mockSessionRepository.create.mockResolvedValueOnce(mockSession);
			mockGenerateSessionId.mockResolvedValueOnce("S002");

			const result = await createAgentSession({
				featureId: "F011",
				userId: "user_001",
			});

			expect(result.agentConfig.model).toBe(MODEL_MAP.opus);
		});

		test("falls back to default model when feature model is invalid", async () => {
			const mockFeature: FeatureSelect = {
				id: "F012",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: null,
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: "invalid-model", // Invalid model
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mockSession = {
				id: "S003",
				userId: "user_001",
				featureId: "F012",
				status: SESSION_STATUS.PENDING,
				startedAt: new Date(),
			};

			mockFeatureRepository.findById.mockResolvedValueOnce(mockFeature);
			mockSessionRepository.create.mockResolvedValueOnce(mockSession);
			mockGenerateSessionId.mockResolvedValueOnce("S003");

			const result = await createAgentSession({
				featureId: "F012",
				userId: "user_001",
			});

			// Should fall back to sonnet default
			expect(result.agentConfig.model).toBe(MODEL_MAP.sonnet);
		});

		test("respects input model override", async () => {
			const mockFeature: FeatureSelect = {
				id: "F013",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: null,
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: "opus",
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mockSession = {
				id: "S004",
				userId: "user_001",
				featureId: "F013",
				status: SESSION_STATUS.PENDING,
				startedAt: new Date(),
			};

			mockFeatureRepository.findById.mockResolvedValueOnce(mockFeature);
			mockSessionRepository.create.mockResolvedValueOnce(mockSession);
			mockGenerateSessionId.mockResolvedValueOnce("S004");

			const result = await createAgentSession({
				featureId: "F013",
				userId: "user_001",
				model: "haiku", // Override
			});

			// Should use input model, not feature model
			expect(result.agentConfig.model).toBe(MODEL_MAP.haiku);
		});

		test("respects custom tools override", async () => {
			const mockFeature: FeatureSelect = {
				id: "F014",
				title: "Test Feature",
				description: "Test description",
				acceptanceCriteria: ["AC1: First criterion"],
				spec: null,
				technicalNotes: null,
				testingRequirements: null,
				status: "pending",
				userId: "user_001",
				projectId: "proj_001",
				category: "core",
				phase: "development",
				passes: false,
				priority: 1,
				estimatedSize: "medium",
				branchName: null,
				model: null,
				thinkingLevel: null,
				planningMode: null,
				planSpec: null,
				descriptionHistory: null,
				files: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			const mockSession = {
				id: "S005",
				userId: "user_001",
				featureId: "F014",
				status: SESSION_STATUS.PENDING,
				startedAt: new Date(),
			};

			mockFeatureRepository.findById.mockResolvedValueOnce(mockFeature);
			mockSessionRepository.create.mockResolvedValueOnce(mockSession);
			mockGenerateSessionId.mockResolvedValueOnce("S005");

			const result = await createAgentSession({
				featureId: "F014",
				userId: "user_001",
				tools: ["Read", "Write"],
			});

			expect(result.agentConfig.tools).toEqual(["Read", "Write"]);
		});
	});
});
