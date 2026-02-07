import { createFileRoute, redirect } from "@tanstack/react-router";
import { AgentChat } from "@/components/agent/agent-chat";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/agent")({
	component: AgentPage,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			redirect({ to: "/login", throw: true });
		}
	},
});

function AgentPage() {
	return (
		<div className="h-full">
			<AgentChat />
		</div>
	);
}
