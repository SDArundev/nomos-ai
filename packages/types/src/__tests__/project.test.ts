import { describe, expect, it } from "bun:test";
import {
	type Project,
	ProjectSchema,
	type ProjectSettings,
	ProjectSettingsSchema,
} from "../project";
import { PROJECT_STATUS } from "../status";

describe("ProjectSettingsSchema", () => {
	it("accepts valid settings with all fields", () => {
		const result = ProjectSettingsSchema.safeParse({
			theme: "dark",
			locale: "fr",
			autoSaveInterval: 60,
			notifications: false,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.theme).toBe("dark");
			expect(result.data.locale).toBe("fr");
			expect(result.data.autoSaveInterval).toBe(60);
			expect(result.data.notifications).toBe(false);
		}
	});

	it("applies defaults for empty object", () => {
		const result = ProjectSettingsSchema.safeParse({});
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.theme).toBe("system");
			expect(result.data.locale).toBe("en");
			expect(result.data.autoSaveInterval).toBe(30);
			expect(result.data.notifications).toBe(true);
		}
	});

	it("accepts all valid theme values", () => {
		const themes = ["light", "dark", "system"] as const;
		for (const theme of themes) {
			const result = ProjectSettingsSchema.safeParse({ theme });
			expect(result.success).toBe(true);
		}
	});

	it("rejects invalid theme", () => {
		const result = ProjectSettingsSchema.safeParse({ theme: "midnight" });
		expect(result.success).toBe(false);
	});

	it("rejects negative autoSaveInterval", () => {
		const result = ProjectSettingsSchema.safeParse({ autoSaveInterval: -1 });
		expect(result.success).toBe(false);
	});

	it("accepts zero autoSaveInterval (disabled)", () => {
		const result = ProjectSettingsSchema.safeParse({ autoSaveInterval: 0 });
		expect(result.success).toBe(true);
	});

	it("rejects fractional autoSaveInterval", () => {
		const result = ProjectSettingsSchema.safeParse({ autoSaveInterval: 30.5 });
		expect(result.success).toBe(false);
	});
});

describe("ProjectSchema", () => {
	const minimalValidProject = {
		id: "proj-001",
		name: "My Project",
		path: "/Users/test/projects/my-project",
		createdAt: "2026-01-28T10:00:00Z",
		updatedAt: "2026-01-28T10:00:00Z",
	};

	describe("Valid Projects", () => {
		it("accepts minimal valid project", () => {
			const result = ProjectSchema.safeParse(minimalValidProject);
			expect(result.success).toBe(true);
		});

		it("applies default status and settings", () => {
			const result = ProjectSchema.safeParse(minimalValidProject);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe("draft");
				expect(result.data.settings).toEqual({
					theme: "system",
					locale: "en",
					autoSaveInterval: 30,
					notifications: true,
				});
			}
		});

		it("accepts full project with all fields", () => {
			const fullProject = {
				...minimalValidProject,
				settings: {
					theme: "dark",
					locale: "de",
					autoSaveInterval: 120,
					notifications: false,
				},
				status: "active",
			};
			const result = ProjectSchema.safeParse(fullProject);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.status).toBe("active");
				expect(result.data.settings.theme).toBe("dark");
			}
		});

		it("accepts all valid status values", () => {
			for (const status of Object.values(PROJECT_STATUS)) {
				const project = { ...minimalValidProject, status };
				const result = ProjectSchema.safeParse(project);
				expect(result.success).toBe(true);
			}
		});

		it("accepts Windows-style absolute path", () => {
			const project = {
				...minimalValidProject,
				path: "C:\\Users\\test\\projects",
			};
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(true);
		});

		it("merges partial settings with defaults", () => {
			const project = {
				...minimalValidProject,
				settings: { theme: "dark" },
			};
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.settings.theme).toBe("dark");
				expect(result.data.settings.locale).toBe("en");
				expect(result.data.settings.autoSaveInterval).toBe(30);
				expect(result.data.settings.notifications).toBe(true);
			}
		});
	});

	describe("Required Field Validation", () => {
		it("rejects missing id", () => {
			const { id, ...noId } = minimalValidProject;
			const result = ProjectSchema.safeParse(noId);
			expect(result.success).toBe(false);
		});

		it("rejects missing name", () => {
			const { name, ...noName } = minimalValidProject;
			const result = ProjectSchema.safeParse(noName);
			expect(result.success).toBe(false);
		});

		it("rejects missing path", () => {
			const { path, ...noPath } = minimalValidProject;
			const result = ProjectSchema.safeParse(noPath);
			expect(result.success).toBe(false);
		});

		it("rejects missing createdAt", () => {
			const { createdAt, ...noCreatedAt } = minimalValidProject;
			const result = ProjectSchema.safeParse(noCreatedAt);
			expect(result.success).toBe(false);
		});

		it("rejects missing updatedAt", () => {
			const { updatedAt, ...noUpdatedAt } = minimalValidProject;
			const result = ProjectSchema.safeParse(noUpdatedAt);
			expect(result.success).toBe(false);
		});
	});

	describe("Name Validation", () => {
		it("rejects empty name", () => {
			const project = { ...minimalValidProject, name: "" };
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(false);
		});

		it("rejects name over 100 characters", () => {
			const project = { ...minimalValidProject, name: "a".repeat(101) };
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(false);
		});

		it("accepts name at max length (100)", () => {
			const project = { ...minimalValidProject, name: "a".repeat(100) };
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(true);
		});
	});

	describe("Path Validation", () => {
		it("rejects empty path", () => {
			const project = { ...minimalValidProject, path: "" };
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(false);
		});

		it("rejects relative path", () => {
			const project = { ...minimalValidProject, path: "relative/path" };
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(false);
		});

		it("rejects path starting with dot", () => {
			const project = { ...minimalValidProject, path: "./relative" };
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(false);
		});
	});

	describe("Timestamp Validation", () => {
		it("rejects invalid createdAt timestamp", () => {
			const project = { ...minimalValidProject, createdAt: "not-a-date" };
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(false);
		});

		it("rejects invalid updatedAt timestamp", () => {
			const project = { ...minimalValidProject, updatedAt: "2026-01-28" };
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(false);
		});

		it("accepts valid ISO 8601 timestamps with Z suffix", () => {
			const project = {
				...minimalValidProject,
				createdAt: "2026-01-28T10:00:00.000Z",
				updatedAt: "2026-01-28T15:30:00Z",
			};
			const result = ProjectSchema.safeParse(project);
			expect(result.success).toBe(true);
		});
	});

	describe("Type Inference", () => {
		it("infers Project type correctly", () => {
			const parsed = ProjectSchema.parse(minimalValidProject);
			const _typed: Project = parsed;
			expect(_typed.id).toBe("proj-001");
		});

		it("infers ProjectSettings type correctly", () => {
			const parsed = ProjectSettingsSchema.parse({});
			const _typed: ProjectSettings = parsed;
			expect(_typed.theme).toBe("system");
		});
	});
});
