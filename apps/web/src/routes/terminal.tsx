import { createFileRoute, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/terminal")({
	component: TerminalPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function TerminalPage() {
	return (
		<div className="h-full p-6">
			<h1 className="font-bold text-2xl">Terminal</h1>
			<p className="text-muted-foreground text-sm">Terminal view coming soon</p>
		</div>
	);
}
