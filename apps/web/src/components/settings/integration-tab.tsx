import { useQuery } from "@tanstack/react-query";
import { ExternalLink, GitPullRequest, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/utils/orpc";

export function IntegrationTab() {
	const modelsQuery = useQuery(orpc.models.list.queryOptions());
	const models = modelsQuery.data ?? [];

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-semibold text-lg">Integrations</h2>
				<p className="text-muted-foreground text-sm">
					External service connections
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						<MessageSquare className="size-4" />
						Claude AI
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<span className="text-sm">Status</span>
							<Badge variant="default" className="bg-green-500">
								Connected
							</Badge>
						</div>
						<div>
							<span className="text-muted-foreground text-sm">
								Available Models
							</span>
							<div className="mt-1 flex flex-wrap gap-1">
								{models.map((m: { alias: string; modelId: string }) => (
									<Badge key={m.alias} variant="outline">
										{m.alias}
									</Badge>
								))}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-sm">
						<GitPullRequest className="size-4" />
						GitHub
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between">
						<span className="text-sm">gh CLI</span>
						<Badge variant="outline">
							<ExternalLink className="mr-1 size-3" />
							Via CLI
						</Badge>
					</div>
					<p className="mt-2 text-muted-foreground text-xs">
						GitHub integration uses the gh CLI tool. Ensure it is installed and
						authenticated.
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
