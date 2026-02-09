import { beforeEach, describe, expect, it } from "bun:test";
import { useAppStore } from "@/store";

const resetStore = () => {
	useAppStore.setState({
		selectedProjectId: null,
	});
};

describe("ProjectSelector - Store Integration", () => {
	beforeEach(resetStore);

	it("starts with no selected project", () => {
		expect(useAppStore.getState().selectedProjectId).toBeNull();
	});

	it("can select a project by ID", () => {
		useAppStore.getState().setSelectedProject("P001");
		expect(useAppStore.getState().selectedProjectId).toBe("P001");
	});

	it("can clear selected project", () => {
		useAppStore.getState().setSelectedProject("P001");
		expect(useAppStore.getState().selectedProjectId).toBe("P001");

		useAppStore.getState().setSelectedProject(null);
		expect(useAppStore.getState().selectedProjectId).toBeNull();
	});

	it("handles selecting different projects", () => {
		useAppStore.getState().setSelectedProject("P001");
		expect(useAppStore.getState().selectedProjectId).toBe("P001");

		useAppStore.getState().setSelectedProject("P002");
		expect(useAppStore.getState().selectedProjectId).toBe("P002");
	});
});
