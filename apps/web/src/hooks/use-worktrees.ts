import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";

export function useWorktrees() {
	const query = useQuery(orpc.worktrees.list.queryOptions());

	return {
		worktrees: query.data ?? [],
		loading: query.isLoading,
		error: query.error,
	};
}
