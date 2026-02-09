import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { authClient } from "@/lib/auth-client";

const EVENT_TYPE_FILTERS = [
	{ label: "All", value: "" },
	{ label: "Agent", value: "agent" },
	{ label: "Feature", value: "feature" },
	{ label: "Auto-Mode", value: "auto-mode" },
	{ label: "Worktree", value: "worktree" },
] as const;

export const Route = createFileRoute("/activity")({
	component: ActivityComponent,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function ActivityComponent() {
	const [typeFilter, setTypeFilter] = useState("");

	return (
		<div className="container mx-auto max-w-3xl px-4 py-6">
			<div className="mb-6">
				<h1 className="font-bold text-2xl">Activity</h1>
				<p className="text-muted-foreground text-sm">
					Recent events across your workspace.
				</p>
			</div>

			<div className="mb-4 flex gap-2">
				{EVENT_TYPE_FILTERS.map((filter) => (
					<button
						key={filter.value}
						type="button"
						onClick={() => setTypeFilter(filter.value)}
						className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
							typeFilter === filter.value
								? "bg-primary text-primary-foreground"
								: "bg-muted text-muted-foreground hover:text-foreground"
						}`}
					>
						{filter.label}
					</button>
				))}
			</div>

			<ActivityFeed limit={50} typeFilter={typeFilter || undefined} />
		</div>
	);
}
