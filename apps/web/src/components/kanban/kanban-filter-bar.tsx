import { FEATURE_CATEGORIES, FEATURE_PHASES } from "@nomos-ai/types";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface KanbanFilterBarProps {
	search?: string;
	category?: string;
	phase?: string;
	onSearchChange: (value: string) => void;
	onCategoryChange: (value: string) => void;
	onPhaseChange: (value: string) => void;
	onClear: () => void;
}

export function KanbanFilterBar({
	search = "",
	category = "",
	phase = "",
	onSearchChange,
	onCategoryChange,
	onPhaseChange,
	onClear,
}: KanbanFilterBarProps) {
	const hasActiveFilters = search || category || phase;

	return (
		<div className="flex items-center gap-3">
			<Input
				type="text"
				placeholder="Search by title..."
				aria-label="Search features by title"
				value={search}
				onChange={(e) => onSearchChange(e.target.value)}
				className="w-64"
			/>

			<Select
				value={category}
				onValueChange={(value) => onCategoryChange(value ?? "")}
			>
				<SelectTrigger className="w-40">
					<SelectValue placeholder="All Categories" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="">All Categories</SelectItem>
					{FEATURE_CATEGORIES.map((cat) => (
						<SelectItem key={cat} value={cat}>
							{cat}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={phase}
				onValueChange={(value) => onPhaseChange(value ?? "")}
			>
				<SelectTrigger className="w-40">
					<SelectValue placeholder="All Phases" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="">All Phases</SelectItem>
					{FEATURE_PHASES.map((p) => (
						<SelectItem key={p} value={p}>
							{p}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{hasActiveFilters && (
				<Button variant="ghost" size="sm" onClick={onClear}>
					<X className="mr-1 size-3.5" />
					Clear
				</Button>
			)}
		</div>
	);
}
