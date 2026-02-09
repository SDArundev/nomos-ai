import type { FeatureStatus } from "@nomos-ai/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { FeatureDetailPanel } from "@/components/kanban/feature-detail-panel";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import { KanbanToolbar } from "@/components/kanban/kanban-toolbar";
import { NewFeatureDialog } from "@/components/kanban/new-feature-dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuth } from "@/lib/auth-guard";
import { useAppStore } from "@/store";
import { orpc } from "@/utils/orpc";

const searchSchema = z.object({
	search: z.string().optional(),
	category: z.string().optional(),
	phase: z.string().optional(),
	page: z.number().int().min(1).optional(),
	pageSize: z.number().int().min(1).max(200).optional(),
});

export const Route = createFileRoute("/kanban")({
	component: KanbanPage,
	validateSearch: searchSchema,
	beforeLoad: requireAuth,
});

function KanbanPage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate({ from: Route.fullPath });
	const searchParams = Route.useSearch();
	const page = searchParams.page ?? 1;
	const pageSize = searchParams.pageSize ?? 50;
	const offset = (page - 1) * pageSize;

	const features = useQuery(
		orpc.features.listPaginated.queryOptions({
			input: { limit: pageSize, offset },
		}),
	);

	const selectedFeatureId = useAppStore((state) => state.selectedFeatureId);
	const setSelectedFeature = useAppStore((state) => state.setSelectedFeature);
	const detailPanelOpen = useAppStore((state) => state.detailPanelOpen);
	const setDetailPanelOpen = useAppStore((state) => state.setDetailPanelOpen);
	const selectedProjectId = useAppStore((state) => state.selectedProjectId);

	const [selectable, setSelectable] = useState(false);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [showNewFeature, setShowNewFeature] = useState(false);

	const invalidateFeatures = {
		queryKey: orpc.features.listPaginated.queryOptions({ input: {} }).queryKey,
	};

	const updateStatus = useMutation(
		orpc.features.updateStatus.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(invalidateFeatures);
				toast.success("Feature status updated");
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update feature status");
			},
		}),
	);

	const bulkUpdateStatus = useMutation(
		orpc.features.bulkUpdateStatus.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(invalidateFeatures);
				toast.success(`Updated ${selectedIds.size} features`);
				setSelectedIds(new Set());
				setSelectable(false);
			},
			onError: (error) => {
				toast.error(error.message || "Bulk update failed");
			},
		}),
	);

	const bulkDelete = useMutation(
		orpc.features.bulkDelete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries(invalidateFeatures);
				toast.success(`Deleted ${selectedIds.size} features`);
				setSelectedIds(new Set());
				setSelectable(false);
			},
			onError: (error) => {
				toast.error(error.message || "Bulk delete failed");
			},
		}),
	);

	const handleToggleSelect = useCallback((id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const handleStatusChange = (id: string, status: string) => {
		updateStatus.mutate({ id, status: status as FeatureStatus });
	};

	const handleFeatureSelect = (id: string) => {
		setSelectedFeature(id);
		setDetailPanelOpen(true);
	};

	const totalFeatures = features.data?.total ?? 0;

	const filteredFeatures = (features.data?.rows ?? []).filter((feature) => {
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

	const handleSelectAll = useCallback(() => {
		const allIds = filteredFeatures.map((f) => f.id);
		setSelectedIds((prev) => {
			if (prev.size === allIds.length) return new Set();
			return new Set(allIds);
		});
	}, [filteredFeatures]);

	const handleBulkStatusChange = (status: string) => {
		bulkUpdateStatus.mutate({
			ids: Array.from(selectedIds),
			status: status as FeatureStatus,
		});
	};

	const handleBulkDelete = () => {
		if (!confirm(`Delete ${selectedIds.size} features? This cannot be undone.`))
			return;
		bulkDelete.mutate({ ids: Array.from(selectedIds) });
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
			<KanbanToolbar
				selectable={selectable}
				onToggleSelectable={() => {
					setSelectable(!selectable);
					if (selectable) setSelectedIds(new Set());
				}}
				onNewFeature={() => setShowNewFeature(true)}
				search={searchParams.search}
				category={searchParams.category}
				phase={searchParams.phase}
				onSearchChange={(value) =>
					navigate({ search: { ...searchParams, search: value || undefined } })
				}
				onCategoryChange={(value) =>
					navigate({
						search: { ...searchParams, category: value || undefined },
					})
				}
				onPhaseChange={(value) =>
					navigate({ search: { ...searchParams, phase: value || undefined } })
				}
				onClearFilters={() => navigate({ search: {} })}
				selectedCount={selectedIds.size}
				totalFiltered={filteredFeatures.length}
				onSelectAll={handleSelectAll}
				onBulkStatusChange={handleBulkStatusChange}
				onBulkDelete={handleBulkDelete}
			/>
			<div className="flex-1 overflow-hidden">
				<KanbanBoard
					features={filteredFeatures}
					onStatusChange={handleStatusChange}
					onFeatureSelect={handleFeatureSelect}
					selectable={selectable}
					selectedIds={selectedIds}
					onToggleSelect={handleToggleSelect}
				/>
			</div>
			<div className="shrink-0 border-t px-6">
				<PaginationControls
					page={page}
					pageSize={pageSize}
					total={totalFeatures}
					onPageChange={(p) =>
						navigate({
							search: { ...searchParams, page: p === 1 ? undefined : p },
						})
					}
					onPageSizeChange={(ps) =>
						navigate({
							search: {
								...searchParams,
								page: undefined,
								pageSize: ps === 50 ? undefined : ps,
							},
						})
					}
				/>
			</div>
			<FeatureDetailPanel
				featureId={selectedFeatureId}
				open={detailPanelOpen}
				onOpenChange={setDetailPanelOpen}
			/>
			<NewFeatureDialog
				open={showNewFeature}
				onOpenChange={setShowNewFeature}
				projectId={selectedProjectId}
			/>
		</div>
	);
}
