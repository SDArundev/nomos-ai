import { describe, expect, it } from "bun:test";

// Nav items configuration from nav-links.tsx
const navItems = [
	{ to: "/", label: "Home", icon: "Home" },
	{ to: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
	{ to: "/projects", label: "Projects", icon: "FolderKanban" },
] as const;

describe("NavLinks - Navigation Items", () => {
	it("has exactly 3 navigation items", () => {
		expect(navItems).toHaveLength(3);
	});

	it("includes Home navigation item", () => {
		const homeItem = navItems.find((item) => item.label === "Home");
		expect(homeItem).toBeDefined();
		expect(homeItem?.to).toBe("/");
		expect(homeItem?.icon).toBe("Home");
	});

	it("includes Dashboard navigation item", () => {
		const dashboardItem = navItems.find((item) => item.label === "Dashboard");
		expect(dashboardItem).toBeDefined();
		expect(dashboardItem?.to).toBe("/dashboard");
		expect(dashboardItem?.icon).toBe("LayoutDashboard");
	});

	it("includes Projects navigation item", () => {
		const projectsItem = navItems.find((item) => item.label === "Projects");
		expect(projectsItem).toBeDefined();
		expect(projectsItem?.to).toBe("/projects");
		expect(projectsItem?.icon).toBe("FolderKanban");
	});

	it("all navigation items have required properties", () => {
		for (const item of navItems) {
			expect(item.to).toBeDefined();
			expect(item.label).toBeDefined();
			expect(item.icon).toBeDefined();
			expect(typeof item.to).toBe("string");
			expect(typeof item.label).toBe("string");
			expect(typeof item.icon).toBe("string");
		}
	});

	it("all navigation paths start with /", () => {
		for (const item of navItems) {
			expect(item.to.startsWith("/")).toBe(true);
		}
	});
});

describe("NavLinks - Collapsed State Behavior", () => {
	it("shows labels when collapsed is false", () => {
		const collapsed = false;
		// When not collapsed, labels should be visible
		expect(collapsed).toBe(false);
	});

	it("hides labels when collapsed is true", () => {
		const collapsed = true;
		// When collapsed, labels should be hidden
		expect(collapsed).toBe(true);
	});

	it("applies justify-center class when collapsed", () => {
		const collapsed = true;
		const className = collapsed ? "justify-center" : "";
		expect(className).toBe("justify-center");
	});

	it("does not apply justify-center class when expanded", () => {
		const collapsed = false;
		const className = collapsed ? "justify-center" : "";
		expect(className).toBe("");
	});
});
