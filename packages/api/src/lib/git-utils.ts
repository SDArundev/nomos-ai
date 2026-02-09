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
