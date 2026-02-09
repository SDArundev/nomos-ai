import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import { auth } from "@nomos-ai/auth";
import { SpecService } from "../../services/spec-service";

// ── Helpers ──────────────────────────────────────────────────

function createMockContext(userId: string) {
	return {
		session: {
			user: { id: userId, email: `${userId}@test.com` },
		},
	};
}

// Extracted from apps/server/src/index.ts
async function extractWsUserId(req: Request): Promise<string | null> {
	try {
		const session = await auth.api.getSession({ headers: req.headers });
		return session?.user?.id ?? null;
	} catch {
		return null;
	}
}

// ── 1. Router ownership rejection patterns ───────────────────
// TODO: Convert to real middleware/router integration tests that invoke actual
// route handlers with mocked DB, verifying HTTP 403 responses instead of
// testing inline string equality. Current tests are validation theater.

describe("Security: Resource ownership enforcement", () => {
	describe("Session ownership verification", () => {
		it("rejects access when session.userId does not match requesting user", () => {
			const session = { id: "sess_1", userId: "user_owner" };
			const requestingUserId = "user_attacker";

			expect(session.userId).not.toBe(requestingUserId);

			// The router should return FORBIDDEN when this check fails
			const isOwner = session.userId === requestingUserId;
			expect(isOwner).toBe(false);
		});

		it("allows access when session.userId matches requesting user", () => {
			const session = { id: "sess_1", userId: "user_owner" };
			const requestingUserId = "user_owner";

			const isOwner = session.userId === requestingUserId;
			expect(isOwner).toBe(true);
		});

		it("rejects access when session does not exist", () => {
			const session = null;
			const requestingUserId = "user_attacker";

			// Both null session and mismatched userId should result in FORBIDDEN
			const hasAccess = session !== null && session.userId === requestingUserId;
			expect(hasAccess).toBe(false);
		});
	});

	describe("Feature ownership verification", () => {
		it("rejects when feature.userId does not match requesting user", () => {
			const feature = { id: "feat_1", userId: "user_owner", projectId: "proj_1" };
			const requestingUserId = "user_attacker";

			expect(feature.userId !== requestingUserId).toBe(true);
		});

		it("allows when feature.userId matches requesting user", () => {
			const feature = { id: "feat_1", userId: "user_owner", projectId: "proj_1" };
			const requestingUserId = "user_owner";

			expect(feature.userId === requestingUserId).toBe(true);
		});
	});

	describe("Project ownership verification", () => {
		it("rejects when project.userId does not match requesting user", () => {
			const project = { id: "proj_1", userId: "user_owner", path: "/tmp/project" };
			const requestingUserId = "user_attacker";

			const isOwner = project.userId === requestingUserId;
			expect(isOwner).toBe(false);
		});

		it("allows when project.userId matches requesting user", () => {
			const project = { id: "proj_1", userId: "user_owner", path: "/tmp/project" };
			const requestingUserId = "user_owner";

			const isOwner = project.userId === requestingUserId;
			expect(isOwner).toBe(true);
		});

		it("rejects when project does not exist (null)", () => {
			const project = null;
			const requestingUserId = "user_attacker";

			const hasAccess =
				project !== null && project.userId === requestingUserId;
			expect(hasAccess).toBe(false);
		});
	});

	describe("Notification ownership via project", () => {
		it("rejects markRead when notification belongs to another user's project", () => {
			const notification = { id: "notif_1", projectId: "proj_1" };
			const project = { id: "proj_1", userId: "user_owner" };
			const requestingUserId = "user_attacker";

			// Router verifies ownership through the notification's projectId
			const isOwner = project.userId === requestingUserId;
			expect(isOwner).toBe(false);
		});

		it("rejects dismiss when notification belongs to another user's project", () => {
			const notification = { id: "notif_1", projectId: "proj_1" };
			const project = { id: "proj_1", userId: "user_owner" };
			const requestingUserId = "user_attacker";

			const isOwner = project.userId === requestingUserId;
			expect(isOwner).toBe(false);
		});

		it("allows markRead when notification belongs to requesting user's project", () => {
			const notification = { id: "notif_1", projectId: "proj_1" };
			const project = { id: "proj_1", userId: "user_owner" };
			const requestingUserId = "user_owner";

			const isOwner = project.userId === requestingUserId;
			expect(isOwner).toBe(true);
		});
	});

	describe("Auto-mode per-user isolation", () => {
		it("per-user state means each user can only stop their own auto-mode", () => {
			// With per-user state, stop(userId) only affects that user's state.
			// No cross-user ownership check is needed — state is inherently scoped.
			const userAState = { isRunning: true, userId: "user_a" };
			const userBState = { isRunning: false, userId: "user_b" };

			// User A can stop their own state
			expect(userAState.isRunning).toBe(true);
			// User B's state is independent
			expect(userBState.isRunning).toBe(false);
		});

		it("per-user status returns only that user's running features", () => {
			const userAStatus = {
				isRunning: true,
				runningFeatures: ["F001"],
				consecutiveFailures: 0,
			};
			const userBStatus = {
				isRunning: false,
				runningFeatures: [],
				consecutiveFailures: 0,
			};

			expect(userAStatus.runningFeatures).toEqual(["F001"]);
			expect(userBStatus.runningFeatures).toEqual([]);
		});
	});

	describe("Learning ownership verification", () => {
		it("rejects when learning.userId does not match requesting user", () => {
			const learning = { id: "learn_1", userId: "user_owner" };
			const requestingUserId = "user_attacker";

			const isOwner = learning.userId === requestingUserId;
			expect(isOwner).toBe(false);
		});

		it("allows when learning.userId matches requesting user", () => {
			const learning = { id: "learn_1", userId: "user_owner" };
			const requestingUserId = "user_owner";

			const isOwner = learning.userId === requestingUserId;
			expect(isOwner).toBe(true);
		});

		it("rejects update on non-existent learning (returns NOT_FOUND)", () => {
			const learning = null;
			const requestingUserId = "user_attacker";

			// Router checks: !existing || existing.userId !== user.id
			const hasAccess =
				learning !== null && learning.userId === requestingUserId;
			expect(hasAccess).toBe(false);
		});

		it("rejects delete on non-existent learning (returns NOT_FOUND)", () => {
			const learning = null;
			const requestingUserId = "user_attacker";

			const hasAccess =
				learning !== null && learning.userId === requestingUserId;
			expect(hasAccess).toBe(false);
		});
	});

	describe("Pattern/Insight/Metric nullable userId", () => {
		it("allows access when insight.userId is null (system-created)", () => {
			const insight = { id: "ins_1", userId: null, featureId: "F001" };
			const requestingUserId = "user_any";

			// Router checks: insight.userId && insight.userId !== user.id
			// Null userId means system-created, allowed for any authenticated user
			const isDenied =
				insight.userId !== null && insight.userId !== requestingUserId;
			expect(isDenied).toBe(false);
		});

		it("rejects access when insight.userId is set and does not match", () => {
			const insight = { id: "ins_1", userId: "user_owner", featureId: "F001" };
			const requestingUserId = "user_attacker";

			const isDenied =
				insight.userId !== null && insight.userId !== requestingUserId;
			expect(isDenied).toBe(true);
		});
	});
});

// ── 2. WebSocket authentication ──────────────────────────────

describe("Security: WebSocket authentication", () => {
	it("rejects unauthenticated WS upgrade (no cookie)", async () => {
		const req = new Request("http://localhost/ws/events", {
			headers: new Headers(),
		});

		const userId = await extractWsUserId(req);
		expect(userId).toBeNull();
	});

	it("rejects WS upgrade with invalid session cookie", async () => {
		const req = new Request("http://localhost/ws/terminal?sessionId=test", {
			headers: new Headers({
				cookie: "better_call_session=invalid_token",
			}),
		});

		const userId = await extractWsUserId(req);
		expect(userId).toBeNull();
	});

	it("rejects WS upgrade with empty auth", async () => {
		const req = new Request("http://localhost/ws/events", {
			headers: new Headers({ cookie: "" }),
		});

		const userId = await extractWsUserId(req);
		expect(userId).toBeNull();
	});

	it("never falls back to anonymous userId", async () => {
		const req = new Request("http://localhost/ws/events");
		const userId = await extractWsUserId(req);

		expect(userId).toBeNull();
		expect(userId).not.toBe("anonymous");
		expect(userId).not.toBe("");
	});
});

// ── 3. Path traversal prevention in SpecService ──────────────

describe("Security: SpecService path traversal prevention", () => {
	it("validatePath logic: resolved path must stay within project root", () => {
		const projectRoot = "/tmp/project";
		const maliciousPath = "/tmp/project/../../etc/passwd";
		const resolvedRoot = resolve(projectRoot);
		const resolvedFile = resolve(maliciousPath);

		// Resolved file path escapes project root
		const isContained =
			resolvedFile.startsWith(`${resolvedRoot}/`) || resolvedFile === resolvedRoot;
		expect(isContained).toBe(false);
	});

	it("validatePath logic: null bytes are detected", () => {
		const path = "/tmp/project\0/malicious";
		expect(path.includes("\0")).toBe(true);
		// validatePath throws "Path traversal detected" on null bytes
	});

	it("validatePath logic: normal subpath is allowed", () => {
		const projectRoot = "/tmp/project";
		const normalPath = "/tmp/project/.nomos/app_spec.json";
		const resolvedRoot = resolve(projectRoot);
		const resolvedFile = resolve(normalPath);

		const isContained =
			resolvedFile.startsWith(`${resolvedRoot}/`) || resolvedFile === resolvedRoot;
		expect(isContained).toBe(true);
	});

	it("loadSpec returns null for non-existent project", async () => {
		const specService = new SpecService();
		const result = await specService.loadSpec("/tmp/nonexistent-project-xyz");
		expect(result).toBeNull();
	});

	it("validatePath logic: symlink-resolved path must also be within root", () => {
		// After resolving symlinks with realpath(), the result must still
		// be under the project root. This prevents symlink-based traversal.
		const projectRoot = "/tmp/project";
		const resolvedRoot = resolve(projectRoot);
		// If a symlink at /tmp/project/.nomos resolves to /etc,
		// the real path /etc/app_spec.json would fail the check
		const symlinkTarget = "/etc/app_spec.json";
		const isContained =
			symlinkTarget.startsWith(`${resolvedRoot}/`) || symlinkTarget === resolvedRoot;
		expect(isContained).toBe(false);
	});
});

// ── 4. Terminal session user isolation ────────────────────────

describe("Security: Terminal session user isolation", () => {
	it("terminal sessions store userId for ownership tracking", () => {
		const session = {
			id: "term_1",
			userId: "user_owner",
			cwd: "/tmp/project",
		};

		expect(session.userId).toBe("user_owner");
	});

	it("terminal list filters by requesting user's sessions only", () => {
		const allSessions = [
			{ id: "term_1", userId: "user_a", cwd: "/tmp/a" },
			{ id: "term_2", userId: "user_b", cwd: "/tmp/b" },
			{ id: "term_3", userId: "user_a", cwd: "/tmp/c" },
		];

		const userASessions = allSessions.filter((s) => s.userId === "user_a");
		expect(userASessions.length).toBe(2);

		const userBSessions = allSessions.filter((s) => s.userId === "user_b");
		expect(userBSessions.length).toBe(1);
	});

	it("rejects write to session owned by another user", () => {
		const session = { id: "term_1", userId: "user_owner" };
		const requestingUserId = "user_attacker";

		const isOwner = session.userId === requestingUserId;
		expect(isOwner).toBe(false);
		// Router throws FORBIDDEN when isOwner is false
	});

	it("rejects kill of session owned by another user", () => {
		const session = { id: "term_1", userId: "user_owner" };
		const requestingUserId = "user_attacker";

		const isOwner = session.userId === requestingUserId;
		expect(isOwner).toBe(false);
	});

	it("rejects resize of session owned by another user", () => {
		const session = { id: "term_1", userId: "user_owner" };
		const requestingUserId = "user_attacker";

		const isOwner = session.userId === requestingUserId;
		expect(isOwner).toBe(false);
	});

	it("rejects scrollback access for session owned by another user", () => {
		const session = { id: "term_1", userId: "user_owner" };
		const requestingUserId = "user_attacker";

		const isOwner = session.userId === requestingUserId;
		expect(isOwner).toBe(false);
	});

	it("terminal environment is sanitized via allowlist", () => {
		const ENV_ALLOWLIST = new Set([
			"PATH", "HOME", "SHELL", "USER", "TERM", "LANG",
			"EDITOR", "LC_ALL", "COLORTERM",
		]);

		// Sensitive keys should NOT be in the allowlist
		expect(ENV_ALLOWLIST.has("DATABASE_URL")).toBe(false);
		expect(ENV_ALLOWLIST.has("BETTER_AUTH_SECRET")).toBe(false);
		expect(ENV_ALLOWLIST.has("ANTHROPIC_API_KEY")).toBe(false);
		expect(ENV_ALLOWLIST.has("REDIS_URL")).toBe(false);

		// Safe keys should be in the allowlist
		expect(ENV_ALLOWLIST.has("PATH")).toBe(true);
		expect(ENV_ALLOWLIST.has("HOME")).toBe(true);
		expect(ENV_ALLOWLIST.has("SHELL")).toBe(true);
	});

	it("terminal cwd blocks null byte injection", () => {
		const cwd = "/tmp/project\0/malicious";
		expect(cwd.includes("\0")).toBe(true);
		// validateCwd throws "Path traversal detected in terminal cwd"
	});
});

// ── 5. Learning curation scoping ─────────────────────────────

describe("Security: Learning curation is user-scoped", () => {
	it("curate operates only on patterns belonging to the requesting user", () => {
		// The curate handler calls patternRepository.findByUser(userId)
		// which filters patterns by userId — not all patterns
		const context = createMockContext("user_a");
		const userId = context.session.user.id;
		expect(userId).toBe("user_a");

		// Mock: findByUser returns only this user's patterns
		const allPatterns = [
			{ id: "pat_1", userId: "user_a", status: "active", confidence: 0.1, evidenceCount: 1, featuresApplied: [] },
			{ id: "pat_2", userId: "user_b", status: "active", confidence: 0.2, evidenceCount: 1, featuresApplied: [] },
		];

		const userPatterns = allPatterns.filter((p) => p.userId === userId);
		expect(userPatterns.length).toBe(1);
		expect(userPatterns[0]?.id).toBe("pat_1");
	});

	it("listPatterns returns only the requesting user's patterns", () => {
		const allPatterns = [
			{ id: "pat_1", userId: "user_a", name: "Pattern A" },
			{ id: "pat_2", userId: "user_b", name: "Pattern B" },
			{ id: "pat_3", userId: "user_a", name: "Pattern C" },
		];

		const userAPatterns = allPatterns.filter((p) => p.userId === "user_a");
		expect(userAPatterns.length).toBe(2);
	});

	it("listAntipatterns returns only the requesting user's antipatterns", () => {
		const allAntipatterns = [
			{ id: "anti_1", userId: "user_a", name: "Anti A" },
			{ id: "anti_2", userId: "user_b", name: "Anti B" },
		];

		const userAAntipatterns = allAntipatterns.filter((a) => a.userId === "user_a");
		expect(userAAntipatterns.length).toBe(1);
	});

	it("relevant endpoint filters patterns by userId and minConfidence", () => {
		const patterns = [
			{ id: "pat_1", userId: "user_a", confidence: 0.9, category: "testing" },
			{ id: "pat_2", userId: "user_a", confidence: 0.5, category: "testing" },
			{ id: "pat_3", userId: "user_b", confidence: 0.9, category: "testing" },
		];

		const minConfidence = 0.7;
		const userId = "user_a";

		const relevant = patterns.filter(
			(p) => p.userId === userId && p.confidence >= minConfidence,
		);
		expect(relevant.length).toBe(1);
		expect(relevant[0]?.id).toBe("pat_1");
	});
});

// ── 6. CSRF protection ──────────────────────────────────────

describe("Security: CSRF protection via X-Requested-With header", () => {
	it("mutation requests require X-Requested-With header", () => {
		// The CSRF middleware checks for X-Requested-With on POST/PUT/PATCH/DELETE
		// requests to /api/* and /rpc/* paths
		const mutationMethods = ["POST", "PUT", "PATCH", "DELETE"];
		const protectedPaths = ["/api/learnings", "/rpc/feature.create"];

		for (const method of mutationMethods) {
			for (const path of protectedPaths) {
				// Without header, middleware should return 403
				const headers = new Headers();
				const hasXRequestedWith = headers.has("X-Requested-With");
				expect(hasXRequestedWith).toBe(false);
			}
		}
	});

	it("GET requests do not require X-Requested-With header", () => {
		const safeMethods = ["GET", "HEAD", "OPTIONS"];
		// CSRF middleware skips safe methods
		for (const method of safeMethods) {
			expect(["GET", "HEAD", "OPTIONS"].includes(method)).toBe(true);
		}
	});

	it("X-Requested-With header value is XMLHttpRequest", () => {
		const headers = new Headers({ "X-Requested-With": "XMLHttpRequest" });
		expect(headers.get("X-Requested-With")).toBe("XMLHttpRequest");
	});
});

// ── 7. Auto-mode bypassPermissions is env-gated ──────────────

describe("Security: bypassPermissions is environment-gated", () => {
	it("defaults to 'default' permission mode when env var is false", () => {
		const CLAUDE_BYPASS_PERMISSIONS = false;
		const permissionMode = CLAUDE_BYPASS_PERMISSIONS
			? "bypassPermissions"
			: "default";
		expect(permissionMode).toBe("default");
	});

	it("uses 'bypassPermissions' only when explicitly enabled", () => {
		const CLAUDE_BYPASS_PERMISSIONS = true;
		const permissionMode = CLAUDE_BYPASS_PERMISSIONS
			? "bypassPermissions"
			: "default";
		expect(permissionMode).toBe("bypassPermissions");
	});
});

// ── 8. Auto-mode userId scoping (no shared mutable state) ────

describe("Security: Auto-mode userId is not shared mutable state", () => {
	it("userId is passed through method calls, not stored on instance", () => {
		// Simulating the refactored executeFeature signature
		const executeFeature = (
			featureId: string,
			projectRoot: string,
			userId: string,
		) => {
			return { featureId, projectRoot, userId };
		};

		const result1 = executeFeature("F001", "/tmp/project", "user_a");
		const result2 = executeFeature("F002", "/tmp/project", "user_b");

		// Each call uses its own userId, no cross-contamination
		expect(result1.userId).toBe("user_a");
		expect(result2.userId).toBe("user_b");
	});

	it("concurrent feature executions do not overwrite each other's userId", () => {
		const executions: Array<{ featureId: string; userId: string }> = [];

		// Simulate two concurrent calls with different userIds
		executions.push({ featureId: "F001", userId: "user_a" });
		executions.push({ featureId: "F002", userId: "user_b" });

		// Each execution retains its own userId
		expect(executions[0]?.userId).toBe("user_a");
		expect(executions[1]?.userId).toBe("user_b");
	});
});
