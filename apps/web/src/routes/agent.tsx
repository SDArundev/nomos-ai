import { createFileRoute } from "@tanstack/react-router";
import { AgentChat } from "@/components/agent/agent-chat";
import { requireAuth } from "@/lib/auth-guard";

export const Route = createFileRoute("/agent")({
	component: AgentPage,
	beforeLoad: requireAuth,
});

function AgentPage() {
	return (
		<div className="h-full">
			<AgentChat />
		</div>
	);
}
