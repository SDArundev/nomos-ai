import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

interface Tab {
	id: string;
	label: string;
}

interface SettingsLayoutProps {
	tabs: Tab[];
	children: Record<string, ReactNode>;
	defaultTab?: string;
}

export function SettingsLayout({ tabs, children, defaultTab }: SettingsLayoutProps) {
	const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0]?.id ?? "");

	return (
		<div className="flex h-full">
			<nav className="w-48 border-r bg-muted/30 p-3">
				<ul className="space-y-1">
					{tabs.map((tab) => (
						<li key={tab.id}>
							<button
								type="button"
								className={cn(
									"w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
									activeTab === tab.id
										? "bg-accent text-accent-foreground"
										: "text-muted-foreground hover:bg-muted/50",
								)}
								onClick={() => setActiveTab(tab.id)}
							>
								{tab.label}
							</button>
						</li>
					))}
				</ul>
			</nav>
			<div className="flex-1 overflow-y-auto p-6">{children[activeTab]}</div>
		</div>
	);
}
