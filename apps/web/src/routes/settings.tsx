import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/settings")({
	component: SettingsPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function SettingsPage() {
	return (
		<div className="h-full p-6">
			<h1 className="font-bold text-2xl">Settings</h1>
			<p className="text-muted-foreground text-sm">Settings page coming soon</p>
		</div>
	);
}
