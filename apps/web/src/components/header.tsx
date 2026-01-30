import { Menu } from "lucide-react";
import { useAppStore } from "@/store";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import UserMenu from "./user-menu";

export default function Header() {
	const toggleSidebar = useAppStore((s) => s.toggleSidebar);

	return (
		<div className="shrink-0 border-b">
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<Button variant="ghost" size="icon-sm" onClick={toggleSidebar}>
					<Menu />
				</Button>
				<div className="flex items-center gap-2">
					<ModeToggle />
					<UserMenu />
				</div>
			</div>
		</div>
	);
}
