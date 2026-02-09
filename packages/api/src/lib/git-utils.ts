/**
 * Git command execution utilities using execFile (no shell injection risk).
 */
import { execFile } from "node:child_process";

function execGit(args: string[], cwd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile("git", args, { cwd }, (error, stdout, stderr) => {
			if (error) {
				reject(
					new Error(
						`git ${args[0]} failed: ${stderr?.trim() ?? error.message}`,
					),
				);
				return;
			}
			resolve(stdout.trim());
		});
	});
}

export async function git(args: string[], cwd: string): Promise<string> {
	return execGit(args, cwd);
}

export async function getCurrentBranch(cwd: string): Promise<string> {
	return git(["rev-parse", "--abbrev-ref", "HEAD"], cwd);
}

export async function branchExists(
	branchName: string,
	cwd: string,
): Promise<boolean> {
	try {
		await git(["rev-parse", "--verify", branchName], cwd);
		return true;
	} catch {
		return false;
	}
}

export async function createBranch(
	branchName: string,
	baseBranch: string,
	cwd: string,
): Promise<void> {
	await git(["branch", branchName, baseBranch], cwd);
}

export async function worktreeAdd(
	path: string,
	branchName: string,
	cwd: string,
): Promise<void> {
	await git(["worktree", "add", path, branchName], cwd);
}

export async function worktreeRemove(path: string, cwd: string): Promise<void> {
	await git(["worktree", "remove", path, "--force"], cwd);
}

export async function worktreeList(cwd: string): Promise<string[]> {
	const output = await git(["worktree", "list", "--porcelain"], cwd);
	return output
		.split("\n")
		.filter((line) => line.startsWith("worktree "))
		.map((line) => line.replace("worktree ", ""));
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitStatus {
	staged: string[];
	unstaged: string[];
	untracked: string[];
}

export interface DiffStat {
	filesChanged: number;
	insertions: number;
	deletions: number;
	files: Array<{ path: string; insertions: number; deletions: number }>;
}

export interface GitLogEntry {
	hash: string;
	author: string;
	date: string;
	message: string;
}

// ---------------------------------------------------------------------------
// Commit helpers
// ---------------------------------------------------------------------------

export async function gitAdd(files: string[], cwd: string): Promise<void> {
	if (files.length === 0) return;
	await git(["add", "--", ...files], cwd);
}

export async function gitAddAll(cwd: string): Promise<void> {
	await git(["add", "-A"], cwd);
}

export async function gitCommit(message: string, cwd: string): Promise<string> {
	const output = await git(["commit", "-m", message], cwd);
	// Extract hash from output like "[branch abc1234] message"
	const match = output.match(/\[.+\s+([a-f0-9]+)\]/);
	return match?.[1] ?? output.split("\n")[0] ?? "";
}

export async function gitStatus(cwd: string): Promise<GitStatus> {
	const output = await git(["status", "--porcelain"], cwd);
	const staged: string[] = [];
	const unstaged: string[] = [];
	const untracked: string[] = [];

	for (const line of output.split("\n")) {
		if (!line || line.length < 3) continue;
		const x = line[0]; // index status
		const y = line[1]; // worktree status
		const file = line.slice(3);

		if (x === "?") {
			untracked.push(file);
		} else {
			if (x !== " " && x !== "?") staged.push(file);
			if (y !== " " && y !== "?") unstaged.push(file);
		}
	}

	return { staged, unstaged, untracked };
}

// ---------------------------------------------------------------------------
// Merge / branch helpers
// ---------------------------------------------------------------------------

export async function gitMerge(
	branch: string,
	cwd: string,
	noFf?: boolean,
): Promise<string> {
	const args = ["merge"];
	if (noFf) args.push("--no-ff");
	args.push(branch);
	return git(args, cwd);
}

export async function gitRebase(onto: string, cwd: string): Promise<void> {
	await git(["rebase", onto], cwd);
}

export async function gitFetch(remote: string, cwd: string): Promise<void> {
	await git(["fetch", remote], cwd);
}

export async function gitCheckout(branch: string, cwd: string): Promise<void> {
	await git(["checkout", branch], cwd);
}

export async function gitPush(
	remote: string,
	branch: string,
	cwd: string,
	force?: boolean,
): Promise<void> {
	const args = ["push", remote, branch];
	if (force) args.push("--force-with-lease");
	await git(args, cwd);
}

// ---------------------------------------------------------------------------
// Diff helpers
// ---------------------------------------------------------------------------

export async function gitDiff(
	ref1: string,
	ref2: string,
	cwd: string,
): Promise<string> {
	return git(["diff", ref1, ref2], cwd);
}

export async function gitDiffStat(
	ref1: string,
	ref2: string,
	cwd: string,
): Promise<DiffStat> {
	const output = await git(["diff", "--stat", "--numstat", ref1, ref2], cwd);
	const files: DiffStat["files"] = [];
	let totalInsertions = 0;
	let totalDeletions = 0;

	for (const line of output.split("\n")) {
		// numstat lines: "10\t5\tpath/to/file"
		const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
		if (match) {
			const insStr = match[1] ?? "0";
			const delStr = match[2] ?? "0";
			const ins = insStr === "-" ? 0 : Number.parseInt(insStr, 10);
			const del = delStr === "-" ? 0 : Number.parseInt(delStr, 10);
			files.push({ path: match[3] ?? "", insertions: ins, deletions: del });
			totalInsertions += ins;
			totalDeletions += del;
		}
	}

	return {
		filesChanged: files.length,
		insertions: totalInsertions,
		deletions: totalDeletions,
		files,
	};
}

export async function gitLog(
	count: number,
	cwd: string,
): Promise<GitLogEntry[]> {
	const separator = "---GIT-LOG-SEP---";
	const output = await git(
		[
			"log",
			`-${count}`,
			`--format=%H${separator}%an${separator}%aI${separator}%s`,
		],
		cwd,
	);

	if (!output) return [];

	return output.split("\n").map((line) => {
		const [hash, author, date, message] = line.split(separator);
		return {
			hash: hash ?? "",
			author: author ?? "",
			date: date ?? "",
			message: message ?? "",
		};
	});
}
