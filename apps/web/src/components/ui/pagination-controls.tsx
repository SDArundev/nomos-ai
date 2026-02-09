import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export interface PaginationControlsProps {
	page: number;
	pageSize: number;
	total: number;
	onPageChange: (page: number) => void;
	onPageSizeChange: (pageSize: number) => void;
}

export function PaginationControls({
	page,
	pageSize,
	total,
	onPageChange,
	onPageSizeChange,
}: PaginationControlsProps) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, total);
	const isFirstPage = page <= 1;
	const isLastPage = page >= totalPages;

	if (total <= 0) {
		return null;
	}

	return (
		<div className="flex items-center justify-between gap-4 py-2">
			<span className="text-muted-foreground text-sm">
				Showing {start}-{end} of {total}
			</span>
			<div className="flex items-center gap-2">
				<Select
					value={String(pageSize)}
					onValueChange={(value: string | null) => {
						if (!value) return;
						const newSize = Number(value);
						onPageSizeChange(newSize);
						onPageChange(1);
					}}
				>
					<SelectTrigger size="sm" aria-label="Page size">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PAGE_SIZE_OPTIONS.map((size) => (
							<SelectItem key={size} value={String(size)}>
								{size} per page
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					variant="outline"
					size="icon-sm"
					onClick={() => onPageChange(page - 1)}
					disabled={isFirstPage}
					aria-label="Previous page"
				>
					<ChevronLeft className="size-4" />
				</Button>
				<span className="min-w-[3rem] text-center text-sm">
					{page} / {totalPages}
				</span>
				<Button
					variant="outline"
					size="icon-sm"
					onClick={() => onPageChange(page + 1)}
					disabled={isLastPage}
					aria-label="Next page"
				>
					<ChevronRight className="size-4" />
				</Button>
			</div>
		</div>
	);
}
