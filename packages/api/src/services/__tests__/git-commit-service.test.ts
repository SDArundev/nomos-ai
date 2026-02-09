import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { IEventService } from "../event-service";

// ── Mock DB repositories ─────────────────────────────────

const mockWorktreeRepo = {
	findByFeatureId: mock(async () => null) as ReturnType<typeof mock>,
};

const mockFeatureRepo = {
	findById: mock(async () => null) as ReturnType<typeof mock>,
};

mock.module("@nomos-ai/db", () => ({
	worktreeRepository: mockWorktreeRepo,
	featureRepository: mockFeatureRepo,
}));

// ── Mock git-utils ───────────────────────────────────────

const mockGitAddAll = mock(async () => {});
const mockGit = mock(async () => "");
const mockGitCommit = mock(async () => "abc1234");
const mockGitStatus = mock(async () => ({
	staged: [] as string[],
	unstaged: [] as string[],
	untracked: [] as string[],
}));

mock.module("../../lib/git-utils", () => ({
	gitAddAll: mockGitAddAll,
	git: mockGit,
	gitCommit: mockGitCommit,
	gitStatus: mockGitStatus,
	// Provide stubs for all exports to prevent cross-file mock leaks
	gitAdd: mock(async () => {}),
	gitFetch: mock(async () => {}),
	gitRebase: mock(async () => {}),
	gitCheckout: mock(async () => {}),
	gitMerge: mock(async () => ""),
	gitPush: mock(async () => {}),
	gitDiff: mock(async () => ""),
	gitDiffStat: mock(async () => ({ filesChanged: 0, insertions: 0, deletions: 0, files: [] })),
	gitLog: mock(async () => []),
	getCurrentBranch: mock(async () => "main"),
	branchExists: mock(async () => false),
	createBranch: mock(async () => {}),
	worktreeAdd: mock(async () => {}),
	worktreeRemove: mock(async () => {}),
	worktreeList: mock(async () => []),
}));

// Import after mocks
const { GitCommitService } = await import("../git-commit-service");

// ── Helpers ──────────────────────────────────────────────

function createMockEventService(): IEventService {
	return {
		emit: mock(() => {}) as IEventService["emit"],
		subscribe: mock(() => () => {}) as IEventService["subscribe"],
		subscriberCount: 0,
	} as IEventService;
}

// ── Tests ────────────────────────────────────────────────

describe("GitCommitService", () => {
	let events: IEventService;
	let service: InstanceType<typeof GitCommitService>;

	beforeEach(() => {
		events = createMockEventService();
		service = new GitCommitService(events);

		mockWorktreeRepo.findByFeatureId.mockReset();
		mockFeatureRepo.findById.mockReset();
		mockGitAddAll.mockReset();
		mockGit.mockReset();
		mockGitCommit.mockReset();
		mockGitStatus.mockReset();
	});

	describe("commitFeature", () => {
		test("stages files, creates commit with feature ID in message, and emits event", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_1",
				featureId: "F031",
				path: "/tmp/worktrees/F031",
				branchName: "feature/F031",
			});

			mockFeatureRepo.findById.mockResolvedValue({
				id: "F031",
				title: "Add dark mode",
				userId: "user1",
			});

			mockGitStatus.mockResolvedValue({
				staged: ["src/theme.ts"],
				unstaged: [],
				untracked: [],
			});

			mockGitCommit.mockResolvedValue("abc1234");

			const result = await service.commitFeature("F031", "/tmp/project");

			expect(result.hash).toBe("abc1234");
			expect(result.message).toBe("feat(F031): Add dark mode");
			expect(result.filesChanged).toBe(1);

			// Verify gitAddAll was called with the worktree path
			expect(mockGitAddAll).toHaveBeenCalledWith("/tmp/worktrees/F031");

			// Verify .nomos/ reset was attempted
			expect(mockGit).toHaveBeenCalledWith(
				["reset", "HEAD", "--", ".nomos/"],
				"/tmp/worktrees/F031",
			);

			// Verify event emission
			expect(events.emit).toHaveBeenCalledWith("worktree:init-completed", {
				featureId: "F031",
				userId: "user1",
				type: "git:commit",
				hash: "abc1234",
			});
		});

		test("throws when nothing to commit (working tree clean)", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_2",
				featureId: "F032",
				path: "/tmp/worktrees/F032",
				branchName: "feature/F032",
			});

			mockFeatureRepo.findById.mockResolvedValue({
				id: "F032",
				title: "Clean feature",
				userId: "user1",
			});

			mockGitStatus.mockResolvedValue({
				staged: [],
				unstaged: [],
				untracked: [],
			});

			await expect(
				service.commitFeature("F032", "/tmp/project"),
			).rejects.toThrow("Nothing to commit");
		});

		test("throws when no worktree found for feature", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue(null);

			await expect(
				service.commitFeature("F999", "/tmp/project"),
			).rejects.toThrow("No active worktree found for feature F999");
		});

		test("throws when feature not found in database", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_3",
				featureId: "F404",
				path: "/tmp/worktrees/F404",
				branchName: "feature/F404",
			});

			mockFeatureRepo.findById.mockResolvedValue(null);

			await expect(
				service.commitFeature("F404", "/tmp/project"),
			).rejects.toThrow("Feature not found: F404");
		});

		test("gracefully handles missing .nomos/ directory during reset", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_4",
				featureId: "F040",
				path: "/tmp/worktrees/F040",
				branchName: "feature/F040",
			});

			mockFeatureRepo.findById.mockResolvedValue({
				id: "F040",
				title: "No nomos dir",
				userId: "user1",
			});

			// git reset .nomos/ throws because directory doesn't exist
			mockGit.mockRejectedValue(new Error("pathspec '.nomos/' did not match any file(s)"));

			mockGitStatus.mockResolvedValue({
				staged: ["src/new-file.ts"],
				unstaged: [],
				untracked: [],
			});

			mockGitCommit.mockResolvedValue("def5678");

			// Should NOT throw — the .nomos/ reset error is caught and ignored
			const result = await service.commitFeature("F040", "/tmp/project");
			expect(result.hash).toBe("def5678");
		});
	});

	describe("verifyCleanState", () => {
		test("returns clean=true when working tree has no changes", async () => {
			mockGitStatus.mockResolvedValue({
				staged: [],
				unstaged: [],
				untracked: [],
			});

			const result = await service.verifyCleanState("/tmp/worktree");

			expect(result.clean).toBe(true);
			expect(result.uncommittedFiles).toHaveLength(0);
		});

		test("returns clean=false with uncommitted files listed", async () => {
			mockGitStatus.mockResolvedValue({
				staged: ["a.ts"],
				unstaged: ["b.ts"],
				untracked: ["c.ts"],
			});

			const result = await service.verifyCleanState("/tmp/worktree");

			expect(result.clean).toBe(false);
			expect(result.uncommittedFiles).toEqual(["a.ts", "b.ts", "c.ts"]);
		});
	});
});
