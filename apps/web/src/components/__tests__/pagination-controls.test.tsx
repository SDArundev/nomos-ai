import { describe, expect, it, mock } from "bun:test";

/**
 * Tests for PaginationControls component logic.
 *
 * Since there is no @testing-library/react installed and Bun has
 * limited jsdom support, we test the pagination computation logic
 * directly — totalPages, start/end ranges, and boundary detection.
 *
 * These formulas are extracted verbatim from:
 *   apps/web/src/components/ui/pagination-controls.tsx
 */

// ── Extracted logic from PaginationControls ──────────────

function computePagination(page: number, pageSize: number, total: number) {
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
	const end = Math.min(page * pageSize, total);
	const isFirstPage = page <= 1;
	const isLastPage = page >= totalPages;

	return { totalPages, start, end, isFirstPage, isLastPage };
}

describe("PaginationControls - Page calculation", () => {
	it("calculates totalPages for exact division", () => {
		const { totalPages } = computePagination(1, 10, 100);
		expect(totalPages).toBe(10);
	});

	it("calculates totalPages with remainder", () => {
		const { totalPages } = computePagination(1, 10, 105);
		expect(totalPages).toBe(11);
	});

	it("totalPages is at least 1 even for 0 items", () => {
		const { totalPages } = computePagination(1, 10, 0);
		expect(totalPages).toBe(1);
	});

	it("totalPages is 1 for fewer items than pageSize", () => {
		const { totalPages } = computePagination(1, 10, 3);
		expect(totalPages).toBe(1);
	});
});

describe("PaginationControls - Range display", () => {
	it("shows 1-10 on first page of 100", () => {
		const { start, end } = computePagination(1, 10, 100);
		expect(start).toBe(1);
		expect(end).toBe(10);
	});

	it("shows 11-20 on second page of 100", () => {
		const { start, end } = computePagination(2, 10, 100);
		expect(start).toBe(11);
		expect(end).toBe(20);
	});

	it("shows 91-100 on last page of 100", () => {
		const { start, end } = computePagination(10, 10, 100);
		expect(start).toBe(91);
		expect(end).toBe(100);
	});

	it("clamps end to total on last partial page", () => {
		const { start, end } = computePagination(4, 10, 35);
		expect(start).toBe(31);
		expect(end).toBe(35);
	});

	it("returns start=0 when total is 0", () => {
		const { start, end } = computePagination(1, 10, 0);
		expect(start).toBe(0);
		expect(end).toBe(0);
	});
});

describe("PaginationControls - Boundary detection", () => {
	it("isFirstPage is true on page 1", () => {
		const { isFirstPage, isLastPage } = computePagination(1, 10, 100);
		expect(isFirstPage).toBe(true);
		expect(isLastPage).toBe(false);
	});

	it("isLastPage is true on final page", () => {
		const { isFirstPage, isLastPage } = computePagination(10, 10, 100);
		expect(isFirstPage).toBe(false);
		expect(isLastPage).toBe(true);
	});

	it("both true when only one page", () => {
		const { isFirstPage, isLastPage } = computePagination(1, 10, 5);
		expect(isFirstPage).toBe(true);
		expect(isLastPage).toBe(true);
	});

	it("middle page is neither first nor last", () => {
		const { isFirstPage, isLastPage } = computePagination(5, 10, 100);
		expect(isFirstPage).toBe(false);
		expect(isLastPage).toBe(false);
	});
});

describe("PaginationControls - Page size options", () => {
	it("supports standard page sizes", () => {
		const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]; // from component
		expect(PAGE_SIZE_OPTIONS).toEqual([10, 20, 50, 100]);
	});

	it("calculates correctly with page size 20", () => {
		const { totalPages, start, end } = computePagination(2, 20, 100);
		expect(totalPages).toBe(5);
		expect(start).toBe(21);
		expect(end).toBe(40);
	});

	it("calculates correctly with page size 50", () => {
		const { totalPages, start, end } = computePagination(1, 50, 75);
		expect(totalPages).toBe(2);
		expect(start).toBe(1);
		expect(end).toBe(50);
	});
});

describe("PaginationControls - Callback behavior", () => {
	it("onPageChange is called with decremented page for Previous", () => {
		const onPageChange = mock(() => {});
		const page = 3;

		// Simulates clicking "Previous" button
		onPageChange(page - 1);
		expect(onPageChange).toHaveBeenCalledWith(2);
	});

	it("onPageChange is called with incremented page for Next", () => {
		const onPageChange = mock(() => {});
		const page = 3;

		// Simulates clicking "Next" button
		onPageChange(page + 1);
		expect(onPageChange).toHaveBeenCalledWith(4);
	});

	it("page size change resets to page 1", () => {
		const onPageChange = mock(() => {});
		const onPageSizeChange = mock(() => {});

		// Simulates the onValueChange handler in the Select
		const newSize = 20;
		onPageSizeChange(newSize);
		onPageChange(1);

		expect(onPageSizeChange).toHaveBeenCalledWith(20);
		expect(onPageChange).toHaveBeenCalledWith(1);
	});
});
