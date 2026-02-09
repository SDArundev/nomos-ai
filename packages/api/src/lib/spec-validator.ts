import { readFile } from "node:fs/promises";
import { join } from "node:path";

interface ValidationError {
	path: string;
	message: string;
}

interface ValidationResult {
	valid: boolean;
	errors: ValidationError[];
}

/**
 * Validates an app_spec.json object against the schema.
 * Uses basic structural checks (not full JSON Schema validation).
 */
export function validateSpec(spec: Record<string, unknown>): ValidationResult {
	const errors: ValidationError[] = [];

	const requiredTopLevel = [
		"meta",
		"vision",
		"constitution",
		"architecture",
		"requirements",
		"phases",
		"constraints",
	];

	for (const field of requiredTopLevel) {
		if (!(field in spec)) {
			errors.push({
				path: field,
				message: `Required field "${field}" is missing`,
			});
		}
	}

	// Validate meta
	if (spec.meta && typeof spec.meta === "object") {
		const meta = spec.meta as Record<string, unknown>;
		if (!meta.name || typeof meta.name !== "string") {
			errors.push({
				path: "meta.name",
				message: "meta.name is required and must be a string",
			});
		}
		if (!meta.version || typeof meta.version !== "string") {
			errors.push({
				path: "meta.version",
				message: "meta.version is required and must be a string",
			});
		}
	}

	// Validate phases (should be an array or object)
	if (
		spec.phases !== undefined &&
		!Array.isArray(spec.phases) &&
		typeof spec.phases !== "object"
	) {
		errors.push({
			path: "phases",
			message: "phases must be an array or object",
		});
	}

	// Validate requirements
	if (
		spec.requirements !== undefined &&
		typeof spec.requirements !== "object"
	) {
		errors.push({
			path: "requirements",
			message: "requirements must be an object",
		});
	}

	return { valid: errors.length === 0, errors };
}

/**
 * Loads and validates the JSON schema file.
 */
export async function loadSchemaFile(
	schemaDir: string,
): Promise<Record<string, unknown> | null> {
	try {
		const content = await readFile(
			join(schemaDir, "app_spec.schema.json"),
			"utf-8",
		);
		return JSON.parse(content);
	} catch {
		return null;
	}
}
