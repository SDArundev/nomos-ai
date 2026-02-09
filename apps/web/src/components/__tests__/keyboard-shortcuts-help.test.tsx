import { describe, expect, it } from "bun:test";
import {
	SHORTCUTS,
	shortcutSettingsKey,
	type ShortcutDefinition,
} from "@/hooks/use-keyboard-shortcuts";

/**
 * Tests for KeyboardShortcutsHelp component logic.
 *
 * Since there is no @testing-library/react installed, we test the
 * data structures and grouping logic used by the component.
 *
 * The component at keyboard-shortcuts-help.tsx groups SHORTCUTS by
 * the GROUPS constant ["General", "Navigation", "Actions"] and
 * renders each group with ShortcutRow components.
 */

const GROUPS = ["General", "Navigation", "Actions"] as const;

describe("KeyboardShortcutsHelp - SHORTCUTS data", () => {
	it("has shortcuts defined", () => {
		expect(SHORTCUTS.length).toBeGreaterThan(0);
	});

	it("every shortcut has required fields", () => {
		for (const shortcut of SHORTCUTS) {
			expect(shortcut.keys).toBeDefined();
			expect(shortcut.keys.length).toBeGreaterThan(0);
			expect(shortcut.label).toBeDefined();
			expect(shortcut.label.length).toBeGreaterThan(0);
			expect(shortcut.group).toBeDefined();
		}
	});

	it("every shortcut belongs to a valid group", () => {
		for (const shortcut of SHORTCUTS) {
			expect(GROUPS).toContain(shortcut.group);
		}
	});
});

describe("KeyboardShortcutsHelp - Grouping logic", () => {
	// This mirrors the exact grouping logic from keyboard-shortcuts-help.tsx
	function groupShortcuts() {
		return GROUPS.reduce(
			(acc, group) => {
				acc[group] = SHORTCUTS.filter((s) => s.group === group);
				return acc;
			},
			{} as Record<string, ShortcutDefinition[]>,
		);
	}

	it("groups shortcuts by category", () => {
		const grouped = groupShortcuts();

		for (const group of GROUPS) {
			expect(grouped[group]).toBeDefined();
			expect(grouped[group].length).toBeGreaterThan(0);
		}
	});

	it("General group contains command palette shortcut", () => {
		const grouped = groupShortcuts();
		const palette = grouped.General.find(
			(s) => s.label === "Open command palette",
		);
		expect(palette).toBeDefined();
		expect(palette?.keys).toContain("K");
	});

	it("General group contains help shortcut", () => {
		const grouped = groupShortcuts();
		const help = grouped.General.find(
			(s) => s.label === "Show keyboard shortcuts",
		);
		expect(help).toBeDefined();
		expect(help?.keys).toContain("?");
	});

	it("Navigation group contains vim-style shortcuts", () => {
		const grouped = groupShortcuts();
		const navShortcuts = grouped.Navigation;

		// All navigation shortcuts use g + key prefix
		for (const shortcut of navShortcuts) {
			expect(shortcut.keys.length).toBe(2);
			expect(shortcut.keys[0]).toBe("g");
		}
	});

	it("Navigation group has expected destinations", () => {
		const grouped = groupShortcuts();
		const labels = grouped.Navigation.map((s) => s.label);

		expect(labels).toContain("Go to Dashboard");
		expect(labels).toContain("Go to Kanban");
		expect(labels).toContain("Go to Settings");
	});

	it("Actions group contains action shortcuts", () => {
		const grouped = groupShortcuts();
		const labels = grouped.Actions.map((s) => s.label);

		expect(labels).toContain("New feature");
		expect(labels).toContain("Focus search");
	});

	it("all shortcuts are accounted for (no ungrouped)", () => {
		const grouped = groupShortcuts();
		const totalGrouped = GROUPS.reduce(
			(sum, g) => sum + grouped[g].length,
			0,
		);
		expect(totalGrouped).toBe(SHORTCUTS.length);
	});
});

describe("KeyboardShortcutsHelp - Settings key generation", () => {
	it("converts label to settings key format", () => {
		expect(shortcutSettingsKey("Open command palette")).toBe(
			"shortcuts.open_command_palette",
		);
	});

	it("handles single-word labels", () => {
		expect(shortcutSettingsKey("Focus")).toBe("shortcuts.focus");
	});

	it("handles labels with multiple spaces", () => {
		expect(shortcutSettingsKey("Go to Dashboard")).toBe(
			"shortcuts.go_to_dashboard",
		);
	});

	it("generates unique key for each shortcut", () => {
		const keys = SHORTCUTS.map((s) => shortcutSettingsKey(s.label));
		const unique = new Set(keys);
		expect(unique.size).toBe(keys.length);
	});
});
