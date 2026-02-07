import type { FeatureStatus } from "@nomos-ai/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { useAppStore } from "@/store";
import { orpc } from "@/utils/orpc";

interface ImportFeature {
	title: string;
	description: string;
	category: string;
	phase: string;
	acceptanceCriteria: string[];
	status?: string;
	priority?: number;
	estimatedSize?: string;
}

export const Route = createFileRoute("/features/import")({
	component: ImportComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function ImportComponent() {
	const queryClient = useQueryClient();
	const selectedProjectId = useAppStore((s) => s.selectedProjectId);
	const [parsed, setParsed] = useState<ImportFeature[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const bulkCreate = useMutation(
		orpc.features.bulkCreate.mutationOptions({
			onSuccess: (results) => {
				const successes = results.filter((r) => r.success).length;
				queryClient.invalidateQueries({
					queryKey: orpc.features.list.queryOptions().queryKey,
				});
				toast.success(`Imported ${successes}/${results.length} features`);
				setParsed([]);
				setProgress(null);
			},
			onError: (err) => {
				toast.error(err.message || "Import failed");
				setProgress(null);
			},
		}),
	);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setError(null);

		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const json = JSON.parse(ev.target?.result as string);
				const features: ImportFeature[] = Array.isArray(json) ? json : json.features;
				if (!Array.isArray(features) || features.length === 0) {
					setError("JSON must be an array of features or an object with a 'features' array");
					return;
				}
				// Basic validation
				for (const f of features) {
					if (!f.title || !f.description || !f.acceptanceCriteria) {
						setError(`Feature "${f.title ?? "unknown"}" is missing required fields (title, description, acceptanceCriteria)`);
						return;
					}
				}
				setParsed(features);
			} catch {
				setError("Invalid JSON file");
			}
		};
		reader.readAsText(file);
	};

	const handleImport = () => {
		if (!selectedProjectId) {
			toast.error("Select a project first");
			return;
		}
		setProgress({ done: 0, total: parsed.length });
		bulkCreate.mutate({
			features: parsed.map((f) => ({
				projectId: selectedProjectId,
				title: f.title,
				description: f.description,
				category: f.category || "core",
				phase: f.phase || "phase-1",
				acceptanceCriteria: f.acceptanceCriteria,
				status: (f.status ?? "backlog") as FeatureStatus,
				priority: f.priority,
				estimatedSize: f.estimatedSize as "XS" | "S" | "M" | "L" | "XL" | undefined,
			})),
		});
	};

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<h1 className="mb-2 font-bold text-2xl">Import Features</h1>
			<p className="mb-6 text-muted-foreground text-sm">
				Upload a JSON file with an array of features to import.
			</p>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle className="text-base">Upload JSON</CardTitle>
				</CardHeader>
				<CardContent>
					<input
						ref={fileRef}
						type="file"
						accept=".json"
						onChange={handleFileChange}
						className="hidden"
					/>
					<Button
						variant="outline"
						onClick={() => fileRef.current?.click()}
					>
						<Upload className="mr-2 size-4" />
						Choose JSON file
					</Button>
					{error && (
						<p className="mt-2 text-destructive text-sm">{error}</p>
					)}
				</CardContent>
			</Card>

			{parsed.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Preview ({parsed.length} features)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="mb-4 max-h-80 overflow-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="border-b text-left">
										<th className="p-2">#</th>
										<th className="p-2">Title</th>
										<th className="p-2">Category</th>
										<th className="p-2">Phase</th>
										<th className="p-2">ACs</th>
									</tr>
								</thead>
								<tbody>
									{parsed.map((f, i) => (
										<tr key={f.title} className="border-b">
											<td className="p-2 text-muted-foreground">{i + 1}</td>
											<td className="p-2">{f.title}</td>
											<td className="p-2">{f.category || "core"}</td>
											<td className="p-2">{f.phase || "phase-1"}</td>
											<td className="p-2">{f.acceptanceCriteria.length}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
						{progress && (
							<p className="mb-2 text-sm">
								Importing {progress.done}/{progress.total}...
							</p>
						)}
						<Button
							onClick={handleImport}
							disabled={bulkCreate.isPending || !selectedProjectId}
						>
							{bulkCreate.isPending ? "Importing..." : `Import All (${parsed.length})`}
						</Button>
						{!selectedProjectId && (
							<p className="mt-2 text-muted-foreground text-xs">
								Select a project from the sidebar first.
							</p>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
