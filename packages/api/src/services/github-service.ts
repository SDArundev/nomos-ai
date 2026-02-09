import { execFile } from "node:child_process";

interface GitHubIssue {
	number: number;
	title: string;
	body: string | null;
	labels: Array<{ name: string }>;
	state: string;
}

interface GitHubPR {
	number: number;
	title: string;
	state: string;
	headRefName: string;
	url: string;
}

function execGh(args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile("gh", args, (error, stdout, stderr) => {
			if (error) {
				reject(
					new Error(`gh ${args[0]} failed: ${stderr?.trim() ?? error.message}`),
				);
				return;
			}
			resolve(stdout.trim());
		});
	});
}

export class GitHubService {
	async listIssues(repo: string): Promise<GitHubIssue[]> {
		const output = await execGh([
			"issue",
			"list",
			"--repo",
			repo,
			"--json",
			"number,title,body,labels,state",
		]);
		return JSON.parse(output) as GitHubIssue[];
	}

	async listPRs(repo: string): Promise<GitHubPR[]> {
		const output = await execGh([
			"pr",
			"list",
			"--repo",
			repo,
			"--json",
			"number,title,state,headRefName,url",
		]);
		return JSON.parse(output) as GitHubPR[];
	}

	async createPR(options: {
		title: string;
		body: string;
		branch: string;
		base?: string;
	}): Promise<string> {
		const output = await execGh([
			"pr",
			"create",
			"--title",
			options.title,
			"--body",
			options.body,
			"--head",
			options.branch,
			"--base",
			options.base ?? "main",
		]);
		return output;
	}

	async inferCategory(labels: Array<{ name: string }>): Promise<string> {
		const labelNames = labels.map((l) => l.name.toLowerCase());
		if (labelNames.some((n) => n.includes("auth"))) return "CAT-AUTH";
		if (labelNames.some((n) => n.includes("db") || n.includes("database")))
			return "CAT-DB";
		if (labelNames.some((n) => n.includes("ui") || n.includes("frontend")))
			return "CAT-UI";
		if (labelNames.some((n) => n.includes("api"))) return "CAT-API";
		return "CAT-CORE";
	}
}
