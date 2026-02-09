import { useMutation } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DecompositionPreview } from "@/components/decomposition-preview";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store";
import { orpc } from "@/utils/orpc";

interface ExpandedSpec {
	title: string;
	description: string;
	category: string;
	phase: string;
	estimatedSize: string;
	acceptanceCriteria: string[];
}

export function IntentBox() {
	const [text, setText] = useState("");
	const [expandedSpec, setExpandedSpec] = useState<ExpandedSpec | null>(null);
	const selectedProjectId = useAppStore((s) => s.selectedProjectId);

	const expand = useMutation(
		orpc.features.expand.mutationOptions({
			onSuccess: (data) => {
				setExpandedSpec(data);
			},
			onError: (error) => {
				toast.error(error.message || "Failed to expand intent");
			},
		}),
	);

	const handleGenerate = () => {
		if (!selectedProjectId) {
			toast.error("Select a project first");
			return;
		}
		const trimmed = text.trim();
		if (trimmed.length === 0) {
			toast.error("Describe what you want to build");
			return;
		}
		expand.mutate({ text: trimmed, projectId: selectedProjectId });
	};

	const handleCreated = () => {
		setExpandedSpec(null);
		setText("");
	};

	const handleCancel = () => {
		setExpandedSpec(null);
	};

	const handleRegenerate = () => {
		if (!selectedProjectId) return;
		expand.mutate({ text: text.trim(), projectId: selectedProjectId });
	};

	if (expandedSpec && selectedProjectId) {
		return (
			<DecompositionPreview
				spec={expandedSpec}
				projectId={selectedProjectId}
				onCreated={handleCreated}
				onCancel={handleCancel}
				onRegenerate={handleRegenerate}
				isRegenerating={expand.isPending}
			/>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Sparkles className="size-4" />
					Intent Box
				</CardTitle>
				<CardDescription>
					Describe what you want to build in plain language. AI will generate a
					structured feature spec.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				<Textarea
					value={text}
					onChange={(e) => setText(e.target.value)}
					placeholder="e.g. Add a dark mode toggle to the settings page that persists the user's preference..."
					rows={3}
					maxLength={2000}
					disabled={expand.isPending}
				/>
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-xs">
						{text.length}/2000
					</span>
					<Button
						onClick={handleGenerate}
						disabled={
							expand.isPending || text.trim().length === 0 || !selectedProjectId
						}
					>
						{expand.isPending ? "Generating..." : "Generate Feature"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
