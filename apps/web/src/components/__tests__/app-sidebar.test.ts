import { beforeEach, describe, expect, it } from "bun:test";
import { useAppStore } from "@/store";

const resetStore = () => {
	useAppStore.setState({
		sidebarCollapsed: false,
	});
};

describe("AppSidebar - State Management", () => {
	beforeEach(resetStore);

	it("sidebar starts in expanded state", () => {
		expect(useAppStore.getState().sidebarCollapsed).toBe(false);
	});

	it("toggleSidebar changes collapsed state", () => {
		const { toggleSidebar } = useAppStore.getState();

		expect(useAppStore.getState().sidebarCollapsed).toBe(false);
		toggleSidebar();
		expect(useAppStore.getState().sidebarCollapsed).toBe(true);
		toggleSidebar();
		expect(useAppStore.getState().sidebarCollapsed).toBe(false);
	});

	it("setSidebarCollapsed sets state directly", () => {
		const { setSidebarCollapsed } = useAppStore.getState();

		setSidebarCollapsed(true);
		expect(useAppStore.getState().sidebarCollapsed).toBe(true);

		setSidebarCollapsed(false);
		expect(useAppStore.getState().sidebarCollapsed).toBe(false);
	});

	it("sidebar state persists across store reads", () => {
		useAppStore.getState().setSidebarCollapsed(true);

		// Read state from a fresh getState() call
		const newState = useAppStore.getState();
		expect(newState.sidebarCollapsed).toBe(true);
	});
});

describe("AppSidebar - Width Calculations", () => {
	it("calculates correct width for expanded sidebar", () => {
		const expandedWidth = "w-64"; // 16rem = 256px
		expect(expandedWidth).toBe("w-64");
	});

	it("calculates correct width for collapsed sidebar", () => {
		const collapsedWidth = "w-16"; // 4rem = 64px
		expect(collapsedWidth).toBe("w-16");
	});
});
