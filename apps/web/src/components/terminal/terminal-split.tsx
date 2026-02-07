import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useTerminalStore } from "@/store/terminal-store";
import { orpc } from "@/utils/orpc";
import { TerminalTabs } from "./terminal-tabs";
import { TerminalView } from "./terminal-view";

export function TerminalSplit() {
	const queryClient = useQueryClient();
	const tabs = useTerminalStore((s) => s.tabs);
	const activeTabId = useTerminalStore((s) => s.activeTabId);
	const addTab = useTerminalStore((s) => s.addTab);
	const removeTab = useTerminalStore((s) => s.removeTab);
	const setActiveTab = useTerminalStore((s) => s.setActiveTab);
	const setTabs = useTerminalStore((s) => s.setTabs);

	// Fetch existing terminal sessions
	const sessionsQuery = useQuery(orpc.terminal.list.queryOptions());

	useEffect(() => {
		if (sessionsQuery.data && tabs.length === 0) {
			const existingTabs = sessionsQuery.data.map((s: { id: string; cwd: string }) => ({
				id: s.id,
				cwd: s.cwd,
				title: s.cwd.split("/").pop() ?? "Terminal",
			}));
			if (existingTabs.length > 0) {
				setTabs(existingTabs);
			}
		}
	}, [sessionsQuery.data, tabs.length, setTabs]);

	const createTerminal = useMutation(
		orpc.terminal.create.mutationOptions({
			onSuccess: (data) => {
				const newTab = {
					id: data.id,
					cwd: "~",
					title: `Terminal ${tabs.length + 1}`,
				};
				addTab(newTab);
				queryClient.invalidateQueries({
					queryKey: orpc.terminal.list.queryOptions().queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const killTerminal = useMutation(
		orpc.terminal.kill.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.terminal.list.queryOptions().queryKey,
				});
			},
		}),
	);

	const handleNewTab = () => {
		createTerminal.mutate({ cwd: process.cwd?.() ?? "." });
	};

	const handleCloseTab = (id: string) => {
		removeTab(id);
		killTerminal.mutate({ sessionId: id });
	};

	return (
		<div className="flex h-full flex-col">
			<TerminalTabs
				tabs={tabs}
				activeTabId={activeTabId}
				onSelectTab={setActiveTab}
				onCloseTab={handleCloseTab}
				onNewTab={handleNewTab}
			/>
			<div className="flex-1">
				<TerminalView sessionId={activeTabId} />
			</div>
		</div>
	);
}
