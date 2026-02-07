import { z } from "zod";
import { protectedProcedure } from "../index";
import { GitHubService } from "../services/github-service";

let githubServiceInstance: GitHubService | null = null;

function getGitHubService(): GitHubService {
	if (!githubServiceInstance) {
		githubServiceInstance = new GitHubService();
	}
	return githubServiceInstance;
}

export const githubRouter = {
	listIssues: protectedProcedure
		.input(z.object({ repo: z.string() }))
		.handler(async ({ input }) => {
			const service = getGitHubService();
			return service.listIssues(input.repo);
		}),

	listPRs: protectedProcedure
		.input(z.object({ repo: z.string() }))
		.handler(async ({ input }) => {
			const service = getGitHubService();
			return service.listPRs(input.repo);
		}),

	createPR: protectedProcedure
		.input(
			z.object({
				title: z.string(),
				body: z.string(),
				branch: z.string(),
				base: z.string().optional(),
			}),
		)
		.handler(async ({ input }) => {
			const service = getGitHubService();
			const url = await service.createPR(input);
			return { url };
		}),
};
