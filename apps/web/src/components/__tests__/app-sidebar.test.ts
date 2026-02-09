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

