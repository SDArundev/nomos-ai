/**
 * Reconcile feature statuses for security features confirmed implemented
 * in Batches 5A-7 but still marked as backlog in the database.
 *
 * Transitions each feature through the state machine:
 *   backlog → pending → in_progress → waiting_approval → verified
 *
 * Usage:
 *   bun run packages/db/src/scripts/reconcile-feature-status.ts
 */
import { eq } from "drizzle-orm";
import { closeDatabase, db } from "../index";
import { feature } from "../schema/features";

const FEATURES_TO_RECONCILE = [
	{ id: "F266", reason: "userId auth in routers (Batch 6)" },
	{ id: "F268", reason: "bypassPermissions gating (Batch 6)" },
	{ id: "F270", reason: "auto-mode userId context (Batch 6)" },
	{ id: "F276", reason: "SpecService path traversal (Batch 5A)" },
	{ id: "F279", reason: "Learning router ownership (Batch 6)" },
	{ id: "F280", reason: "Auto-mode endpoint ownership (Batch 6)" },
	{ id: "F281", reason: "Notification ownership (Batch 6)" },
];

const TRANSITION_PATH = [
	"pending",
	"in_progress",
	"waiting_approval",
	"verified",
] as const;

async function reconcile() {
	console.log(
		`Reconciling ${FEATURES_TO_RECONCILE.length} security features...`,
	);

	let reconciled = 0;
	let skipped = 0;
	let errors = 0;

	for (const { id, reason } of FEATURES_TO_RECONCILE) {
		const rows = await db
			.select()
			.from(feature)
			.where(eq(feature.id, id))
			.limit(1);
		const feat = rows[0];

		if (!feat) {
			console.warn(`  SKIP ${id}: not found in database`);
			skipped++;
			continue;
		}

		if (feat.status === "verified") {
			console.log(`  SKIP ${id}: already verified`);
			skipped++;
			continue;
		}

		if (feat.status !== "backlog") {
			console.warn(
				`  SKIP ${id}: unexpected status "${feat.status}" (expected "backlog")`,
			);
			skipped++;
			continue;
		}

		try {
			// Walk through each transition in sequence
			for (const targetStatus of TRANSITION_PATH) {
				await db
					.update(feature)
					.set({ status: targetStatus })
					.where(eq(feature.id, id));
			}
			console.log(`  OK   ${id}: backlog → verified (${reason})`);
			reconciled++;
		} catch (err) {
			console.error(`  FAIL ${id}:`, err);
			errors++;
		}
	}

	console.log(
		`\nReconciliation complete: ${reconciled} reconciled, ${skipped} skipped, ${errors} errors`,
	);
	await closeDatabase();
	process.exit(errors > 0 ? 1 : 0);
}

reconcile().catch((err) => {
	console.error("Reconciliation failed:", err);
	process.exit(1);
});
