import { FileCode2 } from "lucide-react";

interface DiffHeaderProps {
	fileName: string;
	additions?: number;
	deletions?: number;
}

export function DiffHeader({ fileName, additions, deletions }: DiffHeaderProps) {
	return (
		<div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
			<FileCode2 className="size-4 text-muted-foreground" />
			<span className="font-mono text-sm">{fileName}</span>
			{(additions !== undefined || deletions !== undefined) && (
				<div className="ml-auto flex items-center gap-2 text-xs">
					{additions !== undefined && (
						<span className="text-green-500">+{additions}</span>
					)}
					{deletions !== undefined && (
						<span className="text-red-500">-{deletions}</span>
					)}
				</div>
			)}
		</div>
	);
}
