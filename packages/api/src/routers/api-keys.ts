import { apiKeyRepository } from "@nomos-ai/db";
import { ORPCError } from "@orpc/server";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { generateApiKey } from "../middleware/api-key-auth";

const createApiKeyInput = z.object({
	name: z.string().min(1, "Name is required").max(100),
	expiresAt: z.number().int().positive().optional(),
});

const revokeApiKeyInput = z.object({
	id: z.string().min(1, "API key ID is required"),
});

export const apiKeysRouter = {
	create: protectedProcedure
		.input(createApiKeyInput)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;

			const { key, hash, prefix } = await generateApiKey();

			const record = await apiKeyRepository.create({
				userId,
				name: input.name,
				keyHash: hash,
				keyPrefix: prefix,
				expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
			});

			return {
				id: record.id,
				name: record.name,
				key,
				keyPrefix: prefix,
				expiresAt: record.expiresAt,
				createdAt: record.createdAt,
			};
		}),

	list: protectedProcedure.handler(async ({ context }) => {
		const userId = context.session.user.id;
		const keys = await apiKeyRepository.findByUser(userId);

		return keys.map((k) => ({
			id: k.id,
			name: k.name,
			keyPrefix: k.keyPrefix,
			status: k.status,
			lastUsedAt: k.lastUsedAt,
			expiresAt: k.expiresAt,
			createdAt: k.createdAt,
		}));
	}),

	revoke: protectedProcedure
		.input(revokeApiKeyInput)
		.handler(async ({ input, context }) => {
			const userId = context.session.user.id;
			const existing = await apiKeyRepository.findById(input.id);

			if (!existing || existing.userId !== userId) {
				throw new ORPCError("NOT_FOUND", {
					message: "API key not found",
				});
			}

			if (existing.status === "revoked") {
				throw new ORPCError("BAD_REQUEST", {
					message: "API key is already revoked",
				});
			}

			const revoked = await apiKeyRepository.revoke(input.id);

			return {
				id: revoked.id,
				name: revoked.name,
				status: revoked.status,
			};
		}),
};
