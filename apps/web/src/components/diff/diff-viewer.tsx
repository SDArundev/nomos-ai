import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { DiffHeader } from "./diff-header";

const ReactDiffViewer = lazy(() => import("react-diff-viewer-continued"));

interface DiffViewerProps {
	oldValue: string;
	newValue: string;
	fileName?: string;
	splitView?: boolean;
}

export function DiffViewer({
	oldValue,
	newValue,
	fileName,
	splitView = true,
}: DiffViewerProps) {
	return (
		<div className="flex flex-col overflow-hidden rounded-lg border">
			{fileName && <DiffHeader fileName={fileName} />}
			<div className="overflow-auto">
				<Suspense fallback={<Skeleton className="h-64 w-full" />}>
					<ReactDiffViewer
						oldValue={oldValue}
						newValue={newValue}
						splitView={splitView}
						useDarkTheme
						styles={{
							variables: {
								dark: {
									diffViewerBackground: "hsl(var(--background))",
									addedBackground: "#1a3a2a",
									removedBackground: "#3a1a1a",
									wordAddedBackground: "#2a5a3a",
									wordRemovedBackground: "#5a2a2a",
									addedGutterBackground: "#1a3a2a",
									removedGutterBackground: "#3a1a1a",
									gutterBackground: "hsl(var(--muted))",
									gutterBackgroundDark: "hsl(var(--muted))",
									codeFoldBackground: "hsl(var(--accent))",
									codeFoldGutterBackground: "hsl(var(--accent))",
								},
							},
						}}
					/>
				</Suspense>
			</div>
		</div>
	);
}
