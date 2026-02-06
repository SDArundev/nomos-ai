import { ORPCError } from "@orpc/server";

/**
 * Centralized error handling for repository operations.
 * Converts repository errors into appropriate ORPC errors.
 *
 * @param error - The caught error from repository operation
 * @param operation - Description of the operation (e.g., "create feature")
 * @throws ORPCError with appropriate status code
 */
export function handleRepositoryError(
	error: unknown,
	operation: string,
): never {
	if (error instanceof Error && error.message.includes("not found")) {
		throw new ORPCError("NOT_FOUND", { message: error.message });
	}
	throw new ORPCError("BAD_REQUEST", {
		message: error instanceof Error ? error.message : `Failed to ${operation}`,
	});
}
