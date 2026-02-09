import { beforeEach, describe, expect, mock, test } from "bun:test";

// ── Mock child_process ───────────────────────────────────

type ExecFileCallback = (
	error: Error | null,
	stdout: string,
	stderr: string,
) => void;

const mockExecFile = mock(
	(
		_command: string,
		_args: string[],
		_options: Record<string, unknown>,
		callback: ExecFileCallback,
	) => {
		callback(null, "", "");
	},
);

mock.module("node:child_process", () => ({
	execFile: mockExecFile,
}));

// Import after mock
const { QualityGateService } = await import("../quality-gate-service");

// ── Tests ────────────────────────────────────────────────

describe("QualityGateService", () => {
	let service: InstanceType<typeof QualityGateService>;

	beforeEach(() => {
		service = new QualityGateService();
		mockExecFile.mockReset();
	});

	// ── runTypeCheck ─────────────────────────────────────

	describe("runTypeCheck", () => {
		test("returns PASS when exit code is 0 and no errors", async () => {
			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					cb(null, "", "");
				},
			);

			const result = await service.runTypeCheck("/tmp/project");

			expect(result.gate).toBe("typecheck");
			expect(result.status).toBe("PASS");
			expect(result.errors).toHaveLength(0);
			expect(result.summary).toContain("passed");
			expect(result.duration).toBeGreaterThanOrEqual(0);
		});

		test("returns FAIL with parsed errors when tsc reports errors", async () => {
			const tscOutput = [
				"src/index.ts(10,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.",
				"src/utils.ts(3,1): error TS2304: Cannot find name 'foo'.",
			].join("\n");

			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					const error = Object.assign(new Error("tsc failed"), { code: 1 });
					cb(error, tscOutput, "");
				},
			);

			const result = await service.runTypeCheck("/tmp/project");

			expect(result.gate).toBe("typecheck");
			expect(result.status).toBe("FAIL");
			expect(result.errors).toHaveLength(2);

			expect(result.errors[0]!.file).toBe("src/index.ts");
			expect(result.errors[0]!.line).toBe(10);
			expect(result.errors[0]!.column).toBe(5);
			expect(result.errors[0]!.code).toBe("TS2345");

			expect(result.errors[1]!.file).toBe("src/utils.ts");
			expect(result.errors[1]!.line).toBe(3);
			expect(result.errors[1]!.column).toBe(1);
			expect(result.errors[1]!.code).toBe("TS2304");

			expect(result.summary).toContain("2 errors");
		});
	});

	// ── runLintCheck ─────────────────────────────────────

	describe("runLintCheck", () => {
		test("returns PASS when exit code is 0", async () => {
			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					cb(null, JSON.stringify({ diagnostics: [], summary: { errors: 0, warnings: 0 } }), "");
				},
			);

			const result = await service.runLintCheck("/tmp/project");

			expect(result.gate).toBe("lint");
			expect(result.status).toBe("PASS");
			expect(result.errors).toHaveLength(0);
			expect(result.summary).toBe("Lint check passed");
		});

		test("returns FAIL with diagnostics from Biome JSON output", async () => {
			const biomeReport = {
				summary: { errors: 1, warnings: 1 },
				diagnostics: [
					{
						category: "lint/suspicious/noExplicitAny",
						severity: "error",
						description: "Unexpected any. Specify a different type.",
						location: {
							path: { file: "src/api.ts" },
							span: [5, 8],
							sourceCode: "const x: any = 1;",
						},
					},
					{
						category: "lint/style/useConst",
						severity: "warning",
						description: "This variable could be declared as const.",
						location: {
							path: { file: "src/utils.ts" },
							span: null,
							sourceCode: null,
						},
					},
				],
			};

			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					const error = Object.assign(new Error("lint failed"), { code: 1 });
					cb(error, JSON.stringify(biomeReport), "");
				},
			);

			const result = await service.runLintCheck("/tmp/project");

			expect(result.gate).toBe("lint");
			expect(result.status).toBe("FAIL");
			expect(result.errors).toHaveLength(2);

			expect(result.errors[0]!.file).toBe("src/api.ts");
			expect(result.errors[0]!.code).toBe("lint/suspicious/noExplicitAny");
			expect(result.errors[0]!.message).toContain("Unexpected any");

			expect(result.errors[1]!.file).toBe("src/utils.ts");
			expect(result.errors[1]!.code).toBe("lint/style/useConst");

			expect(result.summary).toContain("1 error");
			expect(result.summary).toContain("1 warning");
		});
	});

	// ── runTests ─────────────────────────────────────────

	describe("runTests", () => {
		test("returns PASS with test counts when all tests pass", async () => {
			const testOutput = [
				"✓ should add numbers [0.5ms]",
				"✓ should subtract numbers [0.3ms]",
				"",
				"42 pass",
				"0 fail",
				"2 skip",
			].join("\n");

			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					cb(null, testOutput, "");
				},
			);

			const result = await service.runTests("/tmp/project");

			expect(result.gate).toBe("test");
			expect(result.status).toBe("PASS");
			expect(result.testsPassed).toBe(42);
			expect(result.testsFailed).toBe(0);
			expect(result.testsSkipped).toBe(2);
			expect(result.summary).toContain("42 tests passed");
		});

		test("returns FAIL with failing test names when tests fail", async () => {
			const testOutput = [
				"✓ should add numbers [0.5ms]",
				"✗ should handle null input [1.2ms]",
				"  at Object.<anonymous> (src/math.test.ts:15:3)",
				"✗ should validate email [0.8ms]",
				"  at Object.<anonymous> (src/validate.test.ts:20:5)",
				"",
				"1 pass",
				"2 fail",
			].join("\n");

			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					const error = Object.assign(new Error("tests failed"), { code: 1 });
					cb(error, testOutput, "");
				},
			);

			const result = await service.runTests("/tmp/project");

			expect(result.gate).toBe("test");
			expect(result.status).toBe("FAIL");
			expect(result.testsPassed).toBe(1);
			expect(result.testsFailed).toBe(2);
			expect(result.summary).toContain("2 of 3");
		});
	});

	// ── runAll (aggregation) ─────────────────────────────

	describe("aggregation", () => {
		test("running all three gates returns results for each", async () => {
			// Mock all three commands to succeed
			mockExecFile.mockImplementation(
				(
					cmd: string,
					args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					if (cmd === "bun" && args[0] === "run" && args[1] === "check-types") {
						cb(null, "", "");
					} else if (cmd === "bunx" && args[0] === "biome") {
						cb(null, JSON.stringify({ diagnostics: [], summary: { errors: 0, warnings: 0 } }), "");
					} else if (cmd === "bun" && args[0] === "test") {
						cb(null, "10 pass\n0 fail", "");
					} else {
						cb(null, "", "");
					}
				},
			);

			const [typecheck, lint, tests] = await Promise.all([
				service.runTypeCheck("/tmp/project"),
				service.runLintCheck("/tmp/project"),
				service.runTests("/tmp/project"),
			]);

			expect(typecheck.gate).toBe("typecheck");
			expect(typecheck.status).toBe("PASS");

			expect(lint.gate).toBe("lint");
			expect(lint.status).toBe("PASS");

			expect(tests.gate).toBe("test");
			expect(tests.status).toBe("PASS");
		});
	});

	// ── Timeout ──────────────────────────────────────────

	describe("timeout handling", () => {
		test("returns FAIL when command exceeds timeout", async () => {
			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					// Simulate timeout error (execFile returns ETIMEDOUT / killed)
					const error = Object.assign(new Error("Command timed out"), { code: 1 });
					cb(error, "", "");
				},
			);

			const result = await service.runTypeCheck("/tmp/project", 1000);

			expect(result.status).toBe("FAIL");
			expect(result.gate).toBe("typecheck");
		});
	});

	// ── execCommand argument verification ────────────────

	describe("command invocation", () => {
		test("runTypeCheck invokes bun run check-types in correct cwd", async () => {
			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					cb(null, "", "");
				},
			);

			await service.runTypeCheck("/my/project");

			expect(mockExecFile).toHaveBeenCalledTimes(1);
			const call = mockExecFile.mock.calls[0]!;
			expect(call[0]).toBe("bun");
			expect(call[1]).toEqual(["run", "check-types"]);
			expect((call[2] as Record<string, unknown>).cwd).toBe("/my/project");
		});

		test("runLintCheck invokes bunx biome check with json reporter", async () => {
			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					cb(null, "{}", "");
				},
			);

			await service.runLintCheck("/my/project");

			expect(mockExecFile).toHaveBeenCalledTimes(1);
			const call = mockExecFile.mock.calls[0]!;
			expect(call[0]).toBe("bunx");
			expect(call[1]).toEqual(["biome", "check", "--reporter=json", "."]);
			expect((call[2] as Record<string, unknown>).cwd).toBe("/my/project");
		});

		test("runTests invokes bun test in correct cwd", async () => {
			mockExecFile.mockImplementation(
				(
					_cmd: string,
					_args: string[],
					_opts: Record<string, unknown>,
					cb: ExecFileCallback,
				) => {
					cb(null, "0 pass", "");
				},
			);

			await service.runTests("/my/project");

			expect(mockExecFile).toHaveBeenCalledTimes(1);
			const call = mockExecFile.mock.calls[0]!;
			expect(call[0]).toBe("bun");
			expect(call[1]).toEqual(["test"]);
			expect((call[2] as Record<string, unknown>).cwd).toBe("/my/project");
		});
	});
});
