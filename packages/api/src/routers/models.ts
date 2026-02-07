import { MODEL_MAP } from "@nomos-ai/types";
import { protectedProcedure } from "../index";

export const modelsRouter = {
	list: protectedProcedure.handler(async () => {
		return Object.entries(MODEL_MAP).map(([alias, modelId]) => ({
			alias,
			modelId,
		}));
	}),
};
