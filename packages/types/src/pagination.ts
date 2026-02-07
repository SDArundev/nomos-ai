import { z } from "zod";

export const paginationParamsSchema = z.object({
	page: z.number().int().min(1).default(1),
	pageSize: z.number().int().min(1).max(100).default(20),
});
export type PaginationParams = z.infer<typeof paginationParamsSchema>;

export interface PaginatedResult<T> {
	data: T[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
}
