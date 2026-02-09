/**
 * Quality gate service — runs typecheck, lint, and test checks against worktrees.
 * Uses execFile (no shell injection risk), following the pattern from git-utils.ts.
 */
import { execFile } from "node:child_process";

const DEFAULT_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityGateError {
	file: string;
	line: number;
	column: number;
	message: string;
	code?: string;
}

export interface QualityGateResult {
	gate: "typecheck" | "lint" | "test";
	status: "PASS" | "FAIL";
	duration: number;
	summary: string;
	errors: QualityGateError[];
}

export interface TestGateResult extends QualityGateResult {
	gate: "test";
	testsPassed: number;
	testsFailed: number;
	testsSkipped: number;
	failures: Array<{
		testName: string;
		file: string;
		stackTrace: string;
	}>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function execCommand(
	command: string,
	args: string[],
	cwd: string,
	timeoutMs: number,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	return new Promise((resolve) => {
		execFile(
			command,
			args,
			{ cwd, timeout: timeoutMs, maxBuffer: 10 * 1024 * 1024 },
			(error, stdout, stderr) => {
				const exitCode =
					error && "code" in error && typeof error.code === "number"
						? error.code
						: error
							? 1
							: 0;
				resolve({
					stdout: stdout ?? "",
					stderr: stderr ?? "",
					exitCode,
				});
			},
		);
	});
}

// Biome JSON reporter types (subset we care about)
interface BiomeDiagnostic {
	category?: string;
	severity?: string;
	description?: string;
	location?: {
		path?: { file?: string };
		span?: [number, number] | null;
		sourceCode?: string;
	};
}

interface BiomeReport {
	summary?: {
		errors?: number;
		warnings?: number;
	};
	diagnostics?: BiomeDiagnostic[];
}

/**
 * Convert a byte offset to line/column using the source text.
 */
function spanToLineCol(
	source: string,
	offset: number,
): { line: number; column: number } {
	const before = source.slice(0, offset);
	const line = before.split("\n").length;
	const lastNewline = before.lastIndexOf("\n");
	const column = offset - lastNewline;
	return { line, column };
}

/**
 * Parse biome JSON reporter output into QualityGateError[].
 */
function parseBiomeErrors(jsonStr: string): {
	errors: QualityGateError[];
	errorCount: number;
	warningCount: number;
} {
	let report: BiomeReport;
	try {
		report = JSON.parse(jsonStr) as BiomeReport;
	} catch {
		return { errors: [], errorCount: 0, warningCount: 0 };
	}

	const errors: QualityGateError[] = [];
	for (const d of report.diagnostics ?? []) {
		if (d.severity !== "error" && d.severity !== "warning") continue;

		const filePath = d.location?.path?.file ?? "<unknown>";
		let line = 0;
		let column = 0;

		if (d.location?.span && d.location.sourceCode) {
			const pos = spanToLineCol(d.location.sourceCode, d.location.span[0]);
			line = pos.line;
			column = pos.column;
		}

		errors.push({
			file: filePath,
			line,
			column,
			message: d.description ?? "Unknown lint issue",
			code: d.category,
		});
	}

	return {
		errors,
		errorCount: report.summary?.errors ?? 0,
		warningCount: report.summary?.warnings ?? 0,
	};
}

// Bun test output parsing types
interface TestFailure {
	testName: string;
	file: string;
	stackTrace: string;
}

/**
 * Parse bun test text output for pass/fail/skip counts and failure details.
 */
function parseBunTestOutput(output: string): {
	passed: number;
	failed: number;
	skipped: number;
	failures: TestFailure[];
} {
	let passed = 0;
	let failed = 0;
	let skipped = 0;

	// Match summary line: "42 pass, 1 fail, 3 skip"
	// or "42 pass" or "1 fail"
	const passMatch = output.match(/(\d+)\s+pass/);
	const failMatch = output.match(/(\d+)\s+fail/);
	const skipMatch = output.match(/(\d+)\s+skip/);

	if (passMatch?.[1]) passed = Number.parseInt(passMatch[1], 10);
	if (failMatch?.[1]) failed = Number.parseInt(failMatch[1], 10);
	if (skipMatch?.[1]) skipped = Number.parseInt(skipMatch[1], 10);

	// Extract test failure blocks
	const failures: TestFailure[] = [];
	// bun test failures look like:
	//   ✗ test name [1.23ms]
	// followed by stack/error info until the next test or blank line
	const failRegex =
		/[✗✘×]\s+(.+?)(?:\s+\[[\d.]+(?:ms|s)])?\s*\n([\s\S]*?)(?=\n(?:[✓✗✘×]|\d+\s+(?:pass|fail)|$))/g;
	let failMatch2 = failRegex.exec(output);
	while (failMatch2 !== null) {
		const testName = (failMatch2[1] ?? "").trim();
		const stackTrace = (failMatch2[2] ?? "").trim();
		// Try to extract file from stack trace
		const fileMatch = stackTrace.match(
			/at\s+.*?\(?([\w/.:-]+\.(?:ts|tsx|js|jsx))(?::(\d+))?/,
		);
		failures.push({
			testName,
			file: fileMatch?.[1] ?? "<unknown>",
			stackTrace,
		});
		failMatch2 = failRegex.exec(output);
	}

	return { passed, failed, skipped, failures };
}

/**
 * Parse TypeScript compiler output lines like:
 *   src/foo.ts(10,5): error TS2345: Argument of type ...
 */
function parseTscErrors(output: string): QualityGateError[] {
	const errors: QualityGateError[] = [];
	const regex = /^(.+?)\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.+)$/gm;
	let match = regex.exec(output);
	while (match !== null) {
		errors.push({
			file: match[1] as string,
			line: Number.parseInt(match[2] as string, 10),
			column: Number.parseInt(match[3] as string, 10),
			message: match[5] as string,
			code: match[4] as string,
		});
		match = regex.exec(output);
	}
	return errors;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class QualityGateService {
	/**
	 * Run TypeScript type checking in the given worktree.
	 * Spawns `bun run check-types` (which should map to tsc --noEmit).
	 */
	async runTypeCheck(
		worktreePath: string,
		timeoutMs = DEFAULT_TIMEOUT_MS,
	): Promise<QualityGateResult> {
		const start = Date.now();

		const { stdout, stderr, exitCode } = await execCommand(
			"bun",
			["run", "check-types"],
			worktreePath,
			timeoutMs,
		);

		const duration = Date.now() - start;
		const combinedOutput = `${stdout}\n${stderr}`;
		const errors = parseTscErrors(combinedOutput);

		const status = exitCode === 0 ? "PASS" : "FAIL";
		const summary =
			status === "PASS"
				? "TypeScript check passed with no errors"
				: `TypeScript check failed with ${errors.length} error${errors.length === 1 ? "" : "s"}`;

		return {
			gate: "typecheck",
			status,
			duration,
			summary,
			errors,
		};
	}

	/**
	 * Run Biome lint check in the given worktree.
	 * Spawns `bunx biome check --reporter=json .` for structured output.
	 */
	async runLintCheck(
		worktreePath: string,
		timeoutMs = DEFAULT_TIMEOUT_MS,
	): Promise<QualityGateResult> {
		const start = Date.now();

		const { stdout, exitCode } = await execCommand(
			"bunx",
			["biome", "check", "--reporter=json", "."],
			worktreePath,
			timeoutMs,
		);

		const duration = Date.now() - start;
		const { errors, errorCount, warningCount } = parseBiomeErrors(stdout);

		const status = exitCode === 0 ? "PASS" : "FAIL";
		const summary =
			status === "PASS"
				? "Lint check passed"
				: `Lint check failed with ${errorCount} error${errorCount === 1 ? "" : "s"} and ${warningCount} warning${warningCount === 1 ? "" : "s"}`;

		return {
			gate: "lint",
			status,
			duration,
			summary,
			errors,
		};
	}

	/**
	 * Run tests in the given worktree.
	 * Spawns `bun test` and parses text output for results.
	 */
	async runTests(
		worktreePath: string,
		timeoutMs = DEFAULT_TIMEOUT_MS,
	): Promise<TestGateResult> {
		const start = Date.now();

		const { stdout, stderr, exitCode } = await execCommand(
			"bun",
			["test"],
			worktreePath,
			timeoutMs,
		);

		const duration = Date.now() - start;
		const combinedOutput = `${stdout}\n${stderr}`;
		const { passed, failed, skipped, failures } =
			parseBunTestOutput(combinedOutput);

		const status = exitCode === 0 ? "PASS" : "FAIL";
		const total = passed + failed + skipped;
		const summary =
			status === "PASS"
				? `All ${passed} test${passed === 1 ? "" : "s"} passed`
				: `${failed} of ${total} test${total === 1 ? "" : "s"} failed`;

		// Convert test failures to QualityGateError format for the errors array
		const errors: QualityGateError[] = failures.map((f) => ({
			file: f.file,
			line: 0,
			column: 0,
			message: f.testName,
		}));

		return {
			gate: "test",
			status,
			duration,
			summary,
			errors,
			testsPassed: passed,
			testsFailed: failed,
			testsSkipped: skipped,
			failures,
		};
	}
}
