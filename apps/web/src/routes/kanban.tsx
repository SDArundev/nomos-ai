import type { FeatureStatus } from "@nomos-ai/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { FeatureDetailPanel } from "@/components/kanban/feature-detail-panel";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanFilterBar } from "@/components/kanban/kanban-filter-bar";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { authClient } from "@/lib/auth-client";
import { useAppStore } from "@/store";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
	search: z.string().optional(),
	category: z.string().optional(),
	phase: z.string().optional(),
});

export const Route = createFileRoute("/kanban")({
	component: KanbanPage,
	validateSearch: searchSchema,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function KanbanPage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate({ from: Route.fullPath });
	const searchParams = Route.useSearch();
	const features = useQuery(orpc.features.list.queryOptions());

	const selectedFeatureId = useAppStore((state) => state.selectedFeatureId);
	const setSelectedFeature = useAppStore((state) => state.setSelectedFeature);
	const detailPanelOpen = useAppStore((state) => state.detailPanelOpen);
	const setDetailPanelOpen = useAppStore((state) => state.setDetailPanelOpen);
	const selectedProjectId = useAppStore((state) => state.selectedProjectId);

	const [showNewFeature, setShowNewFeature] = useState(false);
	const [newTitle, setNewTitle] = useState("");
	const [newDescription, setNewDescription] = useState("");
	const [newCategory, setNewCategory] = useState("core");
	const [newPhase, setNewPhase] = useState("phase-1");
	const [newAC, setNewAC] = useState("");

	const updateStatus = useMutation(
		orpc.features.updateStatus.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Feature status updated");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update feature status");
			},
		}),
	);

	const createFeature = useMutation(
		orpc.features.create.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success("Feature created");
				setShowNewFeature(false);
				setNewTitle("");
				setNewDescription("");
				setNewCategory("core");
				setNewPhase("phase-1");
				setNewAC("");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create feature");
			},
		}),
	);

	const handleCreateFeature = (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedProjectId) {
			toast.error("Select a project first");
			return;
		}
		const acList = newAC
			.split("\n")
			.map((s) => s.trim())
			.filter(Boolean);
		if (acList.length === 0) {
			toast.error("Add at least one acceptance criterion");
			return;
		}
		createFeature.mutate({
			projectId: selectedProjectId,
			title: newTitle.trim(),
			description: newDescription.trim(),
			category: newCategory,
			phase: newPhase,
			acceptanceCriteria: acList,
			status: "backlog" as FeatureStatus,
		});
	};

	const handleStatusChange = (id: string, status: string) => {
		updateStatus.mutate({ id, status: status as FeatureStatus });
	};

	const handleFeatureSelect = (id: string) => {
		setSelectedFeature(id);
		setDetailPanelOpen(true);
	};

	// Filter features client-side
	const filteredFeatures = (features.data ?? []).filter((feature) => {
		if (searchParams.search) {
			const searchLower = searchParams.search.toLowerCase();
			if (!feature.title.toLowerCase().includes(searchLower)) {
				return false;
			}
		}
		if (searchParams.category && feature.category !== searchParams.category) {
			return false;
		}
		if (searchParams.phase && feature.phase !== searchParams.phase) {
			return false;
		}
		return true;
	});

	const handleSearchChange = (value: string) => {
		navigate({
			search: {
				...searchParams,
				search: value || undefined,
			},
		});
	};

	const handleCategoryChange = (value: string) => {
		navigate({
			search: {
				...searchParams,
				category: value || undefined,
			},
		});
	};

	const handlePhaseChange = (value: string) => {
		navigate({
			search: {
				...searchParams,
				phase: value || undefined,
			},
		});
	};

	const handleClearFilters = () => {
		navigate({
			search: {},
		});
	};

	if (features.isLoading) {
		return (
			<div className="container mx-auto max-w-full px-4 py-6">
				<div className="mb-6">
					<Skeleton className="h-8 w-48" />
				</div>
				<div className="flex gap-4">
					{[
						"backlog",
						"pending",
						"in_progress",
						"waiting_approval",
						"verified",
					].map((status) => (
						<div key={status} className="w-72">
							<Skeleton className="mb-4 h-6 w-32" />
							<div className="flex flex-col gap-2">
								<Skeleton className="h-24 w-full rounded-lg" />
								<Skeleton className="h-24 w-full rounded-lg" />
								<Skeleton className="h-24 w-full rounded-lg" />
							</div>
						</div>
					))}
				</div>
			</div>
		);
	}

	if (features.error) {
		return (
			<div className="container mx-auto max-w-4xl px-4 py-6">
				<p className="text-destructive">
					Error loading features: {features.error.message}
				</p>
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-6 py-4">
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h1 className="font-bold text-2xl">Kanban Board</h1>
						<p className="text-muted-foreground text-sm">
							Drag and drop features to change their status
						</p>
					</div>
					<Button onClick={() => setShowNewFeature(true)}>
						<Plus className="mr-2 size-4" />
						New Feature
					</Button>
				</div>
				<KanbanFilterBar
					search={searchParams.search}
					category={searchParams.category}
					phase={searchParams.phase}
					onSearchChange={handleSearchChange}
					onCategoryChange={handleCategoryChange}
					onPhaseChange={handlePhaseChange}
					onClear={handleClearFilters}
				/>
			</div>
			<div className="flex-1 overflow-hidden">
				<KanbanBoard
					features={filteredFeatures}
					onStatusChange={handleStatusChange}
					onFeatureSelect={handleFeatureSelect}
				/>
			</div>
			<FeatureDetailPanel
				featureId={selectedFeatureId}
				open={detailPanelOpen}
				onOpenChange={setDetailPanelOpen}
			/>

			{/* New Feature Dialog */}
			<Dialog open={showNewFeature} onOpenChange={setShowNewFeature}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>New Feature</DialogTitle>
					</DialogHeader>
					<form onSubmit={handleCreateFeature} className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="feat-title">Title</Label>
							<Input
								id="feat-title"
								value={newTitle}
								onChange={(e) => setNewTitle(e.target.value)}
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
								value={newDescription}
								onChange={(e) => setNewDescription(e.target.value)}
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
									value={newCategory}
									onChange={(e) => setNewCategory(e.target.value)}
									placeholder="e.g. core, ui, infra"
									required
								/>
							</div>
							<div className="grid gap-2">
								<Label htmlFor="feat-phase">Phase</Label>
								<Input
									id="feat-phase"
									value={newPhase}
									onChange={(e) => setNewPhase(e.target.value)}
									placeholder="e.g. phase-1"
									required
								/>
							</div>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="feat-ac">
								Acceptance Criteria (one per line)
							</Label>
							<Textarea
								id="feat-ac"
								value={newAC}
								onChange={(e) => setNewAC(e.target.value)}
								placeholder={"App renders without errors\nUnit tests pass\nTypes check clean"}
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
		</div>
	);
}
