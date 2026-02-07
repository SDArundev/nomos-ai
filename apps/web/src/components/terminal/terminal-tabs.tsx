import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TerminalTab } from "@/store/terminal-store";

interface TerminalTabsProps {
	tabs: TerminalTab[];
	activeTabId: string | null;
	onSelectTab: (id: string) => void;
	onCloseTab: (id: string) => void;
	onNewTab: () => void;
}

export function TerminalTabs({
	tabs,
	activeTabId,
	onSelectTab,
	onCloseTab,
	onNewTab,
}: TerminalTabsProps) {
	return (
		<div className="flex items-center border-b bg-muted/30">
			<div className="flex flex-1 items-center overflow-x-auto">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						type="button"
						className={cn(
							"group flex items-center gap-2 border-r px-3 py-1.5 text-sm transition-colors",
							activeTabId === tab.id
								? "bg-background text-foreground"
								: "text-muted-foreground hover:bg-muted/50",
						)}
						onClick={() => onSelectTab(tab.id)}
					>
						<span className="max-w-32 truncate">{tab.title}</span>
						<button
							type="button"
							className="rounded p-0.5 opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
							onClick={(e) => {
								e.stopPropagation();
								onCloseTab(tab.id);
							}}
						>
							<X className="size-3" />
						</button>
					</button>
				))}
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={onNewTab}
				className="mx-1 shrink-0"
			>
				<Plus className="size-4" />
			</Button>
		</div>
	);
}
