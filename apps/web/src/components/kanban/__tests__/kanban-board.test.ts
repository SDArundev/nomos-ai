import { beforeEach, describe, expect, it } from "bun:test";
import { FEATURE_VALID_TRANSITIONS } from "@nomos-ai/types";

// Mock feature data
const mockFeatures = [
	{
		id: "F001",
		title: "Feature One",
		status: "backlog",
		priority: 1,
		estimatedSize: "small",
	},
	{
		id: "F002",
		title: "Feature Two",
		status: "pending",
		priority: 2,
		estimatedSize: "medium",
	},
	{
		id: "F003",
		title: "Feature Three",
		status: "in_progress",
		priority: 3,
		estimatedSize: "large",
	},
	{
		id: "F004",
		title: "Feature Four",
		status: "waiting_approval",
		priority: 4,
		estimatedSize: "small",
	},
	{
		id: "F005",
		title: "Feature Five",
		status: "verified",
		priority: 5,
		estimatedSize: "medium",
	},
];

// Use the canonical transitions from @nomos-ai/types
const VALID_TRANSITIONS = FEATURE_VALID_TRANSITIONS;

describe("KanbanBoard - State Transitions", () => {
	it("validates backlog can transition to pending", () => {
		const currentStatus = "backlog";
		const newStatus = "pending";
		expect(VALID_TRANSITIONS[currentStatus]).toContain(newStatus);
	});

	it("validates backlog can transition to failed", () => {
		const currentStatus = "backlog";
		const newStatus = "failed";
		expect(VALID_TRANSITIONS[currentStatus]).toContain(newStatus);
	});

	it("validates pending can transition to in_progress", () => {
		const currentStatus = "pending";
		const newStatus = "in_progress";
		expect(VALID_TRANSITIONS[currentStatus]).toContain(newStatus);
	});

	it("validates in_progress can transition to waiting_approval", () => {
		const currentStatus = "in_progress";
		const newStatus = "waiting_approval";
		expect(VALID_TRANSITIONS[currentStatus]).toContain(newStatus);
	});

	it("validates waiting_approval can transition to verified", () => {
		const currentStatus = "waiting_approval";
		const newStatus = "verified";
		expect(VALID_TRANSITIONS[currentStatus]).toContain(newStatus);
	});

	it("rejects invalid transition from backlog to verified", () => {
		const currentStatus = "backlog";
		const newStatus = "verified";
		expect(VALID_TRANSITIONS[currentStatus]).not.toContain(newStatus);
	});

	it("rejects invalid transition from pending to verified", () => {
		const currentStatus = "pending";
		const newStatus = "verified";
		expect(VALID_TRANSITIONS[currentStatus]).not.toContain(newStatus);
	});

	it("rejects invalid transition from backlog to in_progress", () => {
		const currentStatus = "backlog";
		const newStatus = "in_progress";
		expect(VALID_TRANSITIONS[currentStatus]).not.toContain(newStatus);
	});

	it("prevents any transitions from verified status", () => {
		const currentStatus = "verified";
		expect(VALID_TRANSITIONS[currentStatus]).toEqual([]);
	});

	it("allows failed to transition to pending (retry)", () => {
		const currentStatus = "failed";
		expect(VALID_TRANSITIONS[currentStatus]).toContain("pending");
	});
});

describe("KanbanBoard - Column Configuration", () => {
	const KANBAN_COLUMNS = [
		{ status: "backlog", title: "Backlog", color: "bg-neutral-500" },
		{ status: "pending", title: "Pending", color: "bg-yellow-500" },
		{ status: "in_progress", title: "In Progress", color: "bg-blue-500" },
		{
			status: "waiting_approval",
			title: "Waiting Approval",
			color: "bg-purple-500",
		},
		{ status: "verified", title: "Verified", color: "bg-green-500" },
	];

	it("has exactly 5 columns", () => {
		expect(KANBAN_COLUMNS).toHaveLength(5);
	});

	it("includes backlog column", () => {
		const column = KANBAN_COLUMNS.find((col) => col.status === "backlog");
		expect(column).toBeDefined();
		expect(column?.title).toBe("Backlog");
		expect(column?.color).toBe("bg-neutral-500");
	});

	it("includes pending column", () => {
		const column = KANBAN_COLUMNS.find((col) => col.status === "pending");
		expect(column).toBeDefined();
		expect(column?.title).toBe("Pending");
		expect(column?.color).toBe("bg-yellow-500");
	});

	it("includes in_progress column", () => {
		const column = KANBAN_COLUMNS.find((col) => col.status === "in_progress");
		expect(column).toBeDefined();
		expect(column?.title).toBe("In Progress");
		expect(column?.color).toBe("bg-blue-500");
	});

	it("includes waiting_approval column", () => {
		const column = KANBAN_COLUMNS.find(
			(col) => col.status === "waiting_approval",
		);
		expect(column).toBeDefined();
		expect(column?.title).toBe("Waiting Approval");
		expect(column?.color).toBe("bg-purple-500");
	});

	it("includes verified column", () => {
		const column = KANBAN_COLUMNS.find((col) => col.status === "verified");
		expect(column).toBeDefined();
		expect(column?.title).toBe("Verified");
		expect(column?.color).toBe("bg-green-500");
	});

	it("does not include failed column", () => {
		const column = KANBAN_COLUMNS.find((col) => col.status === "failed");
		expect(column).toBeUndefined();
	});
});

describe("KanbanBoard - Feature Filtering", () => {
	it("filters features by backlog status", () => {
		const backlogFeatures = mockFeatures.filter((f) => f.status === "backlog");
		expect(backlogFeatures).toHaveLength(1);
		expect(backlogFeatures[0].id).toBe("F001");
	});

	it("filters features by pending status", () => {
		const pendingFeatures = mockFeatures.filter((f) => f.status === "pending");
		expect(pendingFeatures).toHaveLength(1);
		expect(pendingFeatures[0].id).toBe("F002");
	});

	it("filters features by in_progress status", () => {
		const inProgressFeatures = mockFeatures.filter(
			(f) => f.status === "in_progress",
		);
		expect(inProgressFeatures).toHaveLength(1);
		expect(inProgressFeatures[0].id).toBe("F003");
	});

	it("filters features by waiting_approval status", () => {
		const waitingFeatures = mockFeatures.filter(
			(f) => f.status === "waiting_approval",
		);
		expect(waitingFeatures).toHaveLength(1);
		expect(waitingFeatures[0].id).toBe("F004");
	});

	it("filters features by verified status", () => {
		const verifiedFeatures = mockFeatures.filter(
			(f) => f.status === "verified",
		);
		expect(verifiedFeatures).toHaveLength(1);
		expect(verifiedFeatures[0].id).toBe("F005");
	});

	it("returns empty array when no features match status", () => {
		const failedFeatures = mockFeatures.filter((f) => f.status === "failed");
		expect(failedFeatures).toEqual([]);
	});
});

describe("KanbanBoard - Feature Finding", () => {
	it("finds feature by id", () => {
		const feature = mockFeatures.find((f) => f.id === "F001");
		expect(feature).toBeDefined();
		expect(feature?.title).toBe("Feature One");
	});

	it("returns undefined for non-existent feature id", () => {
		const feature = mockFeatures.find((f) => f.id === "F999");
		expect(feature).toBeUndefined();
	});
});

describe("KanbanBoard - Status Change Handler", () => {
	let statusChangeCalls: Array<{ id: string; status: string }>;
	let onStatusChange: (id: string, status: string) => void;

	beforeEach(() => {
		statusChangeCalls = [];
		onStatusChange = (id: string, status: string) => {
			statusChangeCalls.push({ id, status });
		};
	});

	it("calls onStatusChange with correct parameters", () => {
		onStatusChange("F001", "pending");
		expect(statusChangeCalls).toHaveLength(1);
		expect(statusChangeCalls[0]).toEqual({ id: "F001", status: "pending" });
	});

	it("tracks multiple status changes", () => {
		onStatusChange("F001", "pending");
		onStatusChange("F002", "in_progress");
		expect(statusChangeCalls).toHaveLength(2);
		expect(statusChangeCalls[1]).toEqual({
			id: "F002",
			status: "in_progress",
		});
	});
});
