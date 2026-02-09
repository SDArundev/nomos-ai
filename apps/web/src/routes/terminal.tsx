import { createFileRoute } from "@tanstack/react-router";
import { TerminalSplit } from "@/components/terminal/terminal-split";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/terminal")({
	component: TerminalPage,
	beforeLoad: requireAuth,
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
