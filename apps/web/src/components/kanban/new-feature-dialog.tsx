import type { FeatureStatus } from "@nomos-ai/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

interface NewFeatureDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	projectId: string | null;
}

export function NewFeatureDialog({
	open,
	onOpenChange,
	projectId,
}: NewFeatureDialogProps) {
	const queryClient = useQueryClient();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [category, setCategory] = useState("core");
	const [phase, setPhase] = useState("phase-1");
	const [ac, setAC] = useState("");

	const createFeature = useMutation(
		orpc.features.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.listPaginated.queryOptions({ input: {} })
						.queryKey,
				});
				toast.success("Feature created");
				onOpenChange(false);
				setTitle("");
				setDescription("");
				setCategory("core");
				setPhase("phase-1");
				setAC("");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create feature");
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!projectId) {
			toast.error("Select a project first");
			return;
		}
		const acList = ac
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);
		if (acList.length === 0) {
			toast.error("Add at least one acceptance criterion");
			return;
		}
		createFeature.mutate({
			projectId,
			title: title.trim(),
			description: description.trim(),
			category,
			phase,
			acceptanceCriteria: acList,
			status: "backlog" as FeatureStatus,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>New Feature</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="grid gap-4">
					<div className="grid gap-2">
						<Label htmlFor="feat-title">Title</Label>
						<Input
							id="feat-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Feature title (min 5 chars)"
							required
							minLength={5}
							maxLength={80}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="feat-desc">Description</Label>
						<Textarea
							id="feat-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe the feature (min 20 chars)"
							required
							minLength={20}
							maxLength={500}
							rows={3}
						/>
					</div>
					<div className="grid grid-cols-2 gap-4">
						<div className="grid gap-2">
							<Label htmlFor="feat-cat">Category</Label>
							<Input
								id="feat-cat"
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								placeholder="e.g. core, ui, infra"
								required
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="feat-phase">Phase</Label>
							<Input
								id="feat-phase"
								value={phase}
								onChange={(e) => setPhase(e.target.value)}
								placeholder="e.g. phase-1"
								required
							/>
						</div>
					</div>
					<div className="grid gap-2">
						<Label htmlFor="feat-ac">Acceptance Criteria (one per line)</Label>
						<Textarea
							id="feat-ac"
							value={ac}
							onChange={(e) => setAC(e.target.value)}
							placeholder={
								"App renders without errors\nUnit tests pass\nTypes check clean"
							}
							required
							rows={4}
						/>
					</div>
					<Button type="submit" disabled={createFeature.isPending}>
						{createFeature.isPending ? "Creating..." : "Create Feature"}
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
