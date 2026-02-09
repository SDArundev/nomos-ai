import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Columns, Rows } from "lucide-react";
import { useState } from "react";
import { DiffViewer } from "@/components/diff/diff-viewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/utils/orpc";

interface FeatureDiffViewerProps {
	featureId: string;
	projectRoot: string;
}

export function FeatureDiffViewer({
	featureId,
	projectRoot,
}: FeatureDiffViewerProps) {
	const [splitView, setSplitView] = useState(true);
	const [expanded, setExpanded] = useState(false);

	const diffQuery = useQuery(
		orpc.git.diff.queryOptions({
			input: { featureId, projectRoot },
		}),
	);

	const statQuery = useQuery(
		orpc.git.diffStat.queryOptions({
			input: { featureId, projectRoot },
		}),
	);

	if (diffQuery.isLoading || statQuery.isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Changes</CardTitle>
				</CardHeader>
				<CardContent>
					<Skeleton className="h-48 w-full" />
				</CardContent>
			</Card>
		);
	}

	if (diffQuery.isError || !diffQuery.data) {
		return null;
	}

	const stat = statQuery.data;
	const diff = diffQuery.data.diff;

	if (!diff) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Changes</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">No changes yet.</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<button
						type="button"
						className="flex items-center gap-2"
						onClick={() => setExpanded(!expanded)}
					>
						{expanded ? (
							<ChevronDown className="size-4" />
						) : (
							<ChevronRight className="size-4" />
						)}
						<CardTitle>Changes</CardTitle>
						{stat && (
							<span className="ml-2 font-normal text-muted-foreground text-sm">
								{stat.filesChanged} file{stat.filesChanged !== 1 ? "s" : ""}{" "}
								<span className="text-green-500">+{stat.insertions}</span>{" "}
								<span className="text-red-500">-{stat.deletions}</span>
							</span>
						)}
					</button>
					{expanded && (
						<Button
							size="sm"
							variant="ghost"
							onClick={() => setSplitView(!splitView)}
							aria-label={splitView ? "Unified view" : "Split view"}
						>
							{splitView ? (
								<Rows className="size-4" />
							) : (
								<Columns className="size-4" />
							)}
						</Button>
					)}
				</div>
			</CardHeader>
			{expanded && (
				<CardContent className="p-0">
					{stat?.files.map((file) => (
						<div key={file.path} className="border-t">
							<DiffViewer
								oldValue=""
								newValue={diff}
								fileName={file.path}
								splitView={splitView}
							/>
						</div>
					))}
					{(!stat || stat.files.length === 0) && (
						<DiffViewer oldValue="" newValue={diff} splitView={splitView} />
					)}
				</CardContent>
			)}
		</Card>
	);
}
