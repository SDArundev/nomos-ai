import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { IEventService } from "../event-service";

// ── Mock DB repositories ─────────────────────────────────

const mockWorktreeRepo = {
	findByFeatureId: mock(async () => null) as ReturnType<typeof mock>,
	updatePR: mock(async () => {}) as ReturnType<typeof mock>,
};

const mockFeatureRepo = {
	findById: mock(async () => null) as ReturnType<typeof mock>,
	update: mock(async () => ({})) as ReturnType<typeof mock>,
};

mock.module("@nomos-ai/db", () => ({
	worktreeRepository: mockWorktreeRepo,
	featureRepository: mockFeatureRepo,
}));

// ── Mock git-utils ───────────────────────────────────────

const mockGitFetch = mock(async () => {});
const mockGitRebase = mock(async () => {});
const mockGitCheckout = mock(async () => {});
const mockGitMerge = mock(async () => "Merge made by the 'ort' strategy.");
const mockGitPush = mock(async () => {});

mock.module("../../lib/git-utils", () => ({
	gitFetch: mockGitFetch,
	gitRebase: mockGitRebase,
	gitCheckout: mockGitCheckout,
	gitMerge: mockGitMerge,
	gitPush: mockGitPush,
	// Provide stubs for all exports to prevent cross-file mock leaks
	git: mock(async () => ""),
	gitAdd: mock(async () => {}),
	gitAddAll: mock(async () => {}),
	gitCommit: mock(async () => ""),
	gitStatus: mock(async () => ({ staged: [], unstaged: [], untracked: [] })),
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

// ── Mock feature-state-machine ───────────────────────────

const mockTransitionFeatureStatus = mock(async () => {});

mock.module("../../lib/feature-state-machine", () => ({
	transitionFeatureStatus: mockTransitionFeatureStatus,
}));

// Import after mocks
const { GitMergeService } = await import("../git-merge-service");

// ── Helpers ──────────────────────────────────────────────

function createMockEventService(): IEventService {
	return {
		emit: mock(() => {}) as IEventService["emit"],
		subscribe: mock(() => () => {}) as IEventService["subscribe"],
		subscriberCount: 0,
	} as IEventService;
}

// ── Tests ────────────────────────────────────────────────

describe("GitMergeService", () => {
	let events: IEventService;
	let service: InstanceType<typeof GitMergeService>;

	beforeEach(() => {
		events = createMockEventService();
		service = new GitMergeService(events);

		mockWorktreeRepo.findByFeatureId.mockReset();
		mockWorktreeRepo.updatePR.mockReset();
		mockFeatureRepo.findById.mockReset();
		mockFeatureRepo.update.mockReset();
		mockGitFetch.mockReset();
		mockGitRebase.mockReset();
		mockGitCheckout.mockReset();
		mockGitMerge.mockReset();
		mockGitPush.mockReset();
		mockTransitionFeatureStatus.mockReset();
	});

	// ── pushBranch ───────────────────────────────────────

	describe("pushBranch", () => {
		test("pushes feature branch to remote and returns branch name", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_1",
				featureId: "F050",
				path: "/tmp/worktrees/F050",
				branchName: "feature/F050",
			});

			const result = await service.pushBranch("F050");

			expect(result.branch).toBe("feature/F050");
			expect(mockGitPush).toHaveBeenCalledWith(
				"origin",
				"feature/F050",
				"/tmp/worktrees/F050",
				undefined,
			);
		});

		test("throws when no worktree found", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue(null);

			await expect(service.pushBranch("F999")).rejects.toThrow(
				"No active worktree found for feature F999",
			);
		});
	});

	// ── rebaseOnMain ─────────────────────────────────────

	describe("rebaseOnMain", () => {
		test("fetches origin and rebases onto origin/main", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_2",
				featureId: "F060",
				path: "/tmp/worktrees/F060",
				branchName: "feature/F060",
			});

			await service.rebaseOnMain("F060");

			expect(mockGitFetch).toHaveBeenCalledWith("origin", "/tmp/worktrees/F060");
			expect(mockGitRebase).toHaveBeenCalledWith(
				"origin/main",
				"/tmp/worktrees/F060",
			);
		});

		test("throws when no worktree found", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue(null);

			await expect(service.rebaseOnMain("F999")).rejects.toThrow(
				"No active worktree found for feature F999",
			);
		});
	});

	// ── mergeToMain ──────────────────────────────────────

	describe("mergeToMain", () => {
		test("performs full merge flow: fetch, rebase, checkout, merge, push, update status", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_3",
				featureId: "F070",
				path: "/tmp/worktrees/F070",
				branchName: "feature/F070",
			});

			mockFeatureRepo.findById.mockResolvedValue({
				id: "F070",
				title: "Merge test feature",
				userId: "user1",
			});

			mockGitMerge.mockResolvedValue("Merge made by the 'ort' strategy.");

			const result = await service.mergeToMain("F070", "/tmp/project");

			expect(result.merged).toBe(true);
			expect(result.branch).toBe("feature/F070");
			expect(result.message).toBe("Merge made by the 'ort' strategy.");

			// Verify step-by-step execution order
			expect(mockGitFetch).toHaveBeenCalledWith("origin", "/tmp/project");
			expect(mockGitRebase).toHaveBeenCalledWith(
				"origin/main",
				"/tmp/worktrees/F070",
			);
			expect(mockGitCheckout).toHaveBeenCalledWith("main", "/tmp/project");
			expect(mockGitMerge).toHaveBeenCalledWith(
				"feature/F070",
				"/tmp/project",
				true,
			);
			expect(mockGitPush).toHaveBeenCalledWith("origin", "main", "/tmp/project");

			// Verify feature status transition to verified
			expect(mockTransitionFeatureStatus).toHaveBeenCalledWith(
				"F070",
				"verified",
				expect.objectContaining({ verifiedAt: expect.any(Date) }),
			);

			// Verify event emission
			expect(events.emit).toHaveBeenCalledWith("feature:verified", {
				featureId: "F070",
				userId: "user1",
			});
		});

		test("throws when merge fails due to conflicts", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_4",
				featureId: "F080",
				path: "/tmp/worktrees/F080",
				branchName: "feature/F080",
			});

			mockFeatureRepo.findById.mockResolvedValue({
				id: "F080",
				title: "Conflict feature",
				userId: "user1",
			});

			mockGitMerge.mockRejectedValue(
				new Error("git merge failed: CONFLICT (content): Merge conflict in src/index.ts"),
			);

			await expect(
				service.mergeToMain("F080", "/tmp/project"),
			).rejects.toThrow("CONFLICT");
		});

		test("throws when no worktree found", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue(null);

			await expect(
				service.mergeToMain("F999", "/tmp/project"),
			).rejects.toThrow("No active worktree found for feature F999");
		});

		test("throws when feature not found", async () => {
			mockWorktreeRepo.findByFeatureId.mockResolvedValue({
				id: "wt_5",
				featureId: "F404",
				path: "/tmp/worktrees/F404",
				branchName: "feature/F404",
			});

			mockFeatureRepo.findById.mockResolvedValue(null);

			await expect(
				service.mergeToMain("F404", "/tmp/project"),
			).rejects.toThrow("Feature not found: F404");
		});
	});
});
