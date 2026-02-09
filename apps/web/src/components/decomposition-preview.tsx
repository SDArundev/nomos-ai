import type { EstimatedSize } from "@nomos-ai/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/utils/orpc";

interface ExpandedSpec {
	title: string;
	description: string;
	category: string;
	phase: string;
	estimatedSize: string;
	acceptanceCriteria: string[];
}

interface DecompositionPreviewProps {
	spec: ExpandedSpec;
	projectId: string;
	onCreated: () => void;
	onCancel: () => void;
	onRegenerate: () => void;
	isRegenerating: boolean;
}

const SIZES = ["XS", "S", "M", "L", "XL"];

export function DecompositionPreview({
	spec,
	projectId,
	onCreated,
	onCancel,
	onRegenerate,
	isRegenerating,
}: DecompositionPreviewProps) {
	const queryClient = useQueryClient();
	const [title, setTitle] = useState(spec.title);
	const [description, setDescription] = useState(spec.description);
	const [category, setCategory] = useState(spec.category);
	const [phase, setPhase] = useState(spec.phase);
	const [estimatedSize, setEstimatedSize] = useState(spec.estimatedSize);
	const [criteria, setCriteria] = useState<string[]>([
		...spec.acceptanceCriteria,
	]);

	const createFeature = useMutation(
		orpc.features.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Feature created");
				onCreated();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create feature");
			},
		}),
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const filteredCriteria = criteria.filter((c) => c.trim().length > 0);
		if (filteredCriteria.length === 0) {
			toast.error("At least one acceptance criterion is required");
			return;
		}
		createFeature.mutate({
			projectId,
			title: title.trim(),
			description: description.trim(),
			category,
			phase,
			estimatedSize: estimatedSize as EstimatedSize,
			acceptanceCriteria: filteredCriteria,
			status: "backlog",
		});
	};

	const updateCriterion = (index: number, value: string) => {
		setCriteria((prev) => prev.map((c, i) => (i === index ? value : c)));
	};

	const removeCriterion = (index: number) => {
		setCriteria((prev) => prev.filter((_, i) => i !== index));
	};

	const addCriterion = () => {
		if (criteria.length >= 10) return;
		setCriteria((prev) => [...prev, ""]);
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="text-base">Review Feature Spec</CardTitle>
						<CardDescription>
							AI-generated spec. Edit any field before creating.
						</CardDescription>
					</div>
					<Badge variant="secondary">{estimatedSize}</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="preview-title">Title</Label>
						<Input
							id="preview-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							minLength={5}
							maxLength={80}
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="preview-desc">Description</Label>
						<Textarea
							id="preview-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							minLength={20}
							maxLength={500}
							required
							rows={3}
						/>
					</div>

					<div className="grid grid-cols-3 gap-3">
						<div className="space-y-2">
							<Label htmlFor="preview-category">Category</Label>
							<Input
								id="preview-category"
								value={category}
								onChange={(e) => setCategory(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="preview-phase">Phase</Label>
							<Input
								id="preview-phase"
								value={phase}
								onChange={(e) => setPhase(e.target.value)}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label>Size</Label>
							<Select
								value={estimatedSize}
								onValueChange={(value) =>
									setEstimatedSize(value ?? estimatedSize)
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SIZES.map((s) => (
										<SelectItem key={s} value={s}>
											{s}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label>Acceptance Criteria</Label>
						{criteria.map((criterion, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: editable list items use index keys
							<div key={`criterion-${i}`} className="flex gap-2">
								<Input
									value={criterion}
									onChange={(e) => updateCriterion(i, e.target.value)}
									placeholder={`Criterion ${i + 1}`}
								/>
								<Button
									type="button"
									variant="outline"
									size="icon"
									onClick={() => removeCriterion(i)}
									disabled={criteria.length <= 1}
								>
									<Trash2 className="size-4" />
								</Button>
							</div>
						))}
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={addCriterion}
							disabled={criteria.length >= 10}
						>
							<Plus className="mr-1 size-3" />
							Add Criterion
						</Button>
					</div>

					<div className="flex gap-2 pt-2">
						<Button type="submit" disabled={createFeature.isPending}>
							{createFeature.isPending ? "Creating..." : "Create Feature"}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={onRegenerate}
							disabled={isRegenerating}
						>
							<RefreshCw
								className={`mr-1 size-3 ${isRegenerating ? "animate-spin" : ""}`}
							/>
							Regenerate
						</Button>
						<Button type="button" variant="outline" onClick={onCancel}>
							<X className="mr-1 size-3" />
							Cancel
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
}
