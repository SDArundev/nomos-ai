import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/store";
import { orpc } from "@/utils/orpc";

interface ProjectSelectorProps {
	collapsed: boolean;
}

export function ProjectSelector({ collapsed }: ProjectSelectorProps) {
	const { data: projects = [] } = useQuery(orpc.projects.list.queryOptions());
	const selectedProjectId = useAppStore((s) => s.selectedProjectId);
	const setSelectedProject = useAppStore((s) => s.setSelectedProject);

	const selectedProject = projects.find((p) => p.id === selectedProjectId);

	if (collapsed) {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger
					render={
						<Button
							variant="outline"
							size="icon"
							className="m-2 border-sidebar-border"
						/>
					}
				>
					<FolderKanban />
				</DropdownMenuTrigger>
				<DropdownMenuContent className="bg-card" align="start" side="right">
					{projects.length === 0 ? (
						<DropdownMenuItem disabled>No projects</DropdownMenuItem>
					) : (
						projects.map((project) => (
							<DropdownMenuItem
								key={project.id}
								onClick={() => setSelectedProject(project.id)}
							>
								{project.name}
							</DropdownMenuItem>
						))
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="outline"
						className="m-2 w-[calc(100%-1rem)] justify-between border-sidebar-border"
					/>
				}
			>
				<div className="flex items-center gap-2">
					<FolderKanban className="size-4" />
					<span className="truncate">
						{selectedProject ? selectedProject.name : "Select Project"}
					</span>
				</div>
				<ChevronDown className="size-4 opacity-50" />
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[calc(var(--anchor-width))] bg-card">
				{projects.length === 0 ? (
					<DropdownMenuItem disabled>No projects</DropdownMenuItem>
				) : (
					projects.map((project) => (
						<DropdownMenuItem
							key={project.id}
							onClick={() => setSelectedProject(project.id)}
						>
							{project.name}
						</DropdownMenuItem>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
