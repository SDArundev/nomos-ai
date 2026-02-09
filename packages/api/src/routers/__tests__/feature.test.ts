import { describe, expect, it } from "bun:test";
import { FEATURE_STATUS, FEATURE_VALID_TRANSITIONS } from "@nomos-ai/types";

const VALID_TRANSITIONS = FEATURE_VALID_TRANSITIONS;

describe("Feature Status Transitions", () => {
	it("should allow valid transition: backlog -> pending", () => {
		const current = FEATURE_STATUS.BACKLOG;
		const next = FEATURE_STATUS.PENDING;
		const allowed = VALID_TRANSITIONS[current];
		expect(allowed).toContain(next);
	});

	it("should allow valid transition: pending -> in_progress", () => {
		const current = FEATURE_STATUS.PENDING;
		const next = FEATURE_STATUS.IN_PROGRESS;
		const allowed = VALID_TRANSITIONS[current];
		expect(allowed).toContain(next);
	});

	it("should allow valid transition: in_progress -> waiting_approval", () => {
		const current = FEATURE_STATUS.IN_PROGRESS;
		const next = FEATURE_STATUS.WAITING_APPROVAL;
		const allowed = VALID_TRANSITIONS[current];
		expect(allowed).toContain(next);
	});

	it("should allow valid transition: waiting_approval -> verified", () => {
		const current = FEATURE_STATUS.WAITING_APPROVAL;
		const next = FEATURE_STATUS.VERIFIED;
		const allowed = VALID_TRANSITIONS[current];
		expect(allowed).toContain(next);
	});

	it("should allow transition to failed from any active state", () => {
		for (const status of [
			FEATURE_STATUS.BACKLOG,
			FEATURE_STATUS.PENDING,
			FEATURE_STATUS.IN_PROGRESS,
			FEATURE_STATUS.WAITING_APPROVAL,
		]) {
			const allowed = VALID_TRANSITIONS[status];
			expect(allowed).toContain(FEATURE_STATUS.FAILED);
		}
	});

	it("should reject invalid transition: backlog -> verified", () => {
		const current = FEATURE_STATUS.BACKLOG;
		const next = FEATURE_STATUS.VERIFIED;
		const allowed = VALID_TRANSITIONS[current];
		expect(allowed).not.toContain(next);
	});

	it("should reject invalid transition: backlog -> in_progress", () => {
		const current = FEATURE_STATUS.BACKLOG;
		const next = FEATURE_STATUS.IN_PROGRESS;
		const allowed = VALID_TRANSITIONS[current];
		expect(allowed).not.toContain(next);
	});

	it("should reject transitions from terminal states", () => {
		expect(VALID_TRANSITIONS[FEATURE_STATUS.VERIFIED]).toEqual([]);
		expect(VALID_TRANSITIONS[FEATURE_STATUS.FAILED]).toEqual([]);
	});

	it("should reject backward transitions", () => {
		const current = FEATURE_STATUS.IN_PROGRESS;
		const backward = FEATURE_STATUS.BACKLOG;
		const allowed = VALID_TRANSITIONS[current];
		expect(allowed).not.toContain(backward);
	});

	it("should validate bulk update transitions correctly", () => {
		const features = [
			{ id: "F001", status: FEATURE_STATUS.BACKLOG },
			{ id: "F002", status: FEATURE_STATUS.VERIFIED },
		];
		const targetStatus = FEATURE_STATUS.PENDING;

		const invalid: string[] = [];
		for (const feat of features) {
			const allowed = VALID_TRANSITIONS[feat.status];
			if (!allowed || !allowed.includes(targetStatus)) {
				invalid.push(`${feat.id}: ${feat.status} -> ${targetStatus}`);
			}
		}

		expect(invalid.length).toBe(1);
		expect(invalid[0]).toContain("F002");
	});
});
