import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { orpc } from "@/utils/orpc";

export function CurationControls() {
	const queryClient = useQueryClient();

	const curate = useMutation(
		orpc.learnings.curate.mutationOptions({
			onSuccess: (data) => {
				queryClient.invalidateQueries({
					queryKey: orpc.learnings.listPatterns.queryOptions().queryKey,
				});
				toast.success(
					`Curation complete: ${data.promoted} promoted, ${data.pruned} pruned`,
				);
			},
			onError: (error) => {
				toast.error(error.message || "Curation failed");
			},
		}),
	);

	return (
		<div className="mb-3 flex justify-end">
			<button
				type="button"
				onClick={() => curate.mutate({})}
				disabled={curate.isPending}
				className={cn(
					"flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs transition-colors",
					"bg-muted text-muted-foreground hover:text-foreground",
					curate.isPending && "cursor-not-allowed opacity-50",
				)}
			>
				<Sparkles className="size-3.5" />
				{curate.isPending ? "Curating..." : "Run Curation"}
			</button>
		</div>
	);
}
