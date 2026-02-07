import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useGitHubIssues(repo: string | null) {
	const query = useQuery({
		...orpc.github.listIssues.queryOptions({
			input: { repo: repo ?? "" },
		}),
		enabled: !!repo,
	});

	return {
		issues: query.data ?? [],
		loading: query.isLoading,
		error: query.error,
	};
}

export function useGitHubPRs(repo: string | null) {
	const query = useQuery({
		...orpc.github.listPRs.queryOptions({
			input: { repo: repo ?? "" },
		}),
		enabled: !!repo,
	});

	return {
		prs: query.data ?? [],
		loading: query.isLoading,
		error: query.error,
	};
}
