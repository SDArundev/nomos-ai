import { ORPCError } from "@orpc/server";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Centralized error handling for repository operations.
 * Converts repository errors into appropriate ORPC errors.
 * In production, internal details are logged server-side only.
 *
 * @param error - The caught error from repository operation
 * @param operation - Description of the operation (e.g., "create feature")
 * @throws ORPCError with appropriate status code
 */
export function handleRepositoryError(
	error: unknown,
	operation: string,
): never {
	const internalMessage =
		error instanceof Error ? error.message : String(error);

	// Always log internal details server-side
	if (isProduction) {
		console.error(`[${operation}] Repository error:`, internalMessage);
	}

	if (error instanceof Error && error.message.includes("not found")) {
		throw new ORPCError("NOT_FOUND", {
			message: `Resource not found`,
		});
	}
	if (
		error instanceof Error &&
		(error.message.includes("UNIQUE") || error.message.includes("unique"))
	) {
		throw new ORPCError("CONFLICT", {
			message: `A record with that value already exists`,
		});
	}

	throw new ORPCError("BAD_REQUEST", {
		message: isProduction
			? `Failed to ${operation}`
			: internalMessage || `Failed to ${operation}`,
	});
}
