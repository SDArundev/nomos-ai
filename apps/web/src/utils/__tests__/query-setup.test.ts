import { describe, expect, it } from "bun:test";
import "./setup"; // Set up environment variables
import { queryClient } from "../orpc";

describe("QueryClient Configuration", () => {
	it("has query default options", () => {
		const defaults = queryClient.getDefaultOptions();
		expect(defaults.queries).toBeDefined();
	});

	it("has staleTime set to 60 seconds", () => {
		const defaults = queryClient.getDefaultOptions();
		expect(defaults.queries?.staleTime).toBe(60 * 1000);
	});

	it("has gcTime set to 5 minutes", () => {
		const defaults = queryClient.getDefaultOptions();
		expect(defaults.queries?.gcTime).toBe(5 * 60 * 1000);
	});

	it("has query retry set to 3", () => {
		const defaults = queryClient.getDefaultOptions();
		expect(defaults.queries?.retry).toBe(3);
	});

	it("has query retryDelay configured with exponential backoff", () => {
		const defaults = queryClient.getDefaultOptions();
		expect(typeof defaults.queries?.retryDelay).toBe("function");
		const retryDelay = defaults.queries?.retryDelay as (
			attemptIndex: number,
		) => number;
		expect(retryDelay(0)).toBe(1000);
		expect(retryDelay(1)).toBe(2000);
		expect(retryDelay(2)).toBe(4000);
		expect(retryDelay(5)).toBe(30000);
	});

	it("has mutation retry set to 1", () => {
		const defaults = queryClient.getDefaultOptions();
		expect(defaults.mutations?.retry).toBe(1);
	});

	it("has queryCache configured", () => {
		const cache = queryClient.getQueryCache();
		expect(cache).toBeDefined();
	});
});
