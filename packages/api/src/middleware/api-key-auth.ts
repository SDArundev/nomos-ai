import { apiKeyRepository } from "@nomos-ai/db";
import type { Context, Next } from "hono";

const API_KEY_PREFIX = "nms_";

/**
 * Hono middleware that authenticates requests via Bearer token (API key).
 *
 * Checks for `Authorization: Bearer nms_...` header.
 * If present: validates key, sets userId in oRPC context, updates lastUsedAt.
 * If absent: falls through to session auth (dual auth support).
 */
export async function apiKeyAuthMiddleware(c: Context, next: Next) {
	const authHeader = c.req.header("Authorization");

	if (!authHeader?.startsWith("Bearer ")) {
		return next();
	}

	const token = authHeader.slice(7);

	if (!token.startsWith(API_KEY_PREFIX)) {
		return c.json({ error: "Invalid API key format" }, 401);
	}

	const keyHash = await hashApiKey(token);
	const record = await apiKeyRepository.findActiveByKeyHash(keyHash);

	if (!record) {
		return c.json({ error: "Invalid or revoked API key" }, 401);
	}

	if (record.expiresAt && record.expiresAt.getTime() < Date.now()) {
		return c.json({ error: "API key has expired" }, 401);
	}

	// Update last used timestamp (non-blocking)
	apiKeyRepository.updateLastUsed(record.id).catch(() => {});

	// Set API key user info on the context for downstream handlers
	c.set("apiKeyUserId", record.userId);
	c.set("apiKeyId", record.id);

	return next();
}

/**
 * SHA-256 hash an API key for secure storage/lookup.
 */
export async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = new Uint8Array(hashBuffer);
	return Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Generate a new API key with the nms_ prefix.
 * Returns the full key (to be shown to the user once) and its hash (for storage).
 */
export async function generateApiKey(): Promise<{
	key: string;
	hash: string;
	prefix: string;
}> {
	const randomBytes = new Uint8Array(16);
	crypto.getRandomValues(randomBytes);
	const hex = Array.from(randomBytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	const key = `${API_KEY_PREFIX}${hex}`;
	const hash = await hashApiKey(key);
	const prefix = key.slice(0, 12);
	return { key, hash, prefix };
}
