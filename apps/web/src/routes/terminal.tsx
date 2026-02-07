import { createFileRoute, redirect } from "@tanstack/react-router";
import { TerminalSplit } from "@/components/terminal/terminal-split";
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
		<div className="flex h-full flex-col">
			<div className="border-b px-6 py-4">
				<h1 className="font-bold text-2xl">Terminal</h1>
				<p className="text-muted-foreground text-sm">
					Interactive terminal sessions
				</p>
			</div>
			<div className="flex-1 overflow-hidden">
				<TerminalSplit />
			</div>
		</div>
	);
}
