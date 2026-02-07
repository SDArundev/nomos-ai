import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { agentRouter } from "./agent";
import { autoModeRouter } from "./auto-mode";
import { eventsRouter } from "./events";
import { featureRouter } from "./feature";
import { fsRouter } from "./fs";
import { githubRouter } from "./github";
import { learningRouter } from "./learning";
import { modelsRouter } from "./models";
import { notificationsRouter } from "./notifications";
import { pipelineRouter } from "./pipeline";
import { projectRouter } from "./project";
import { sessionRouter } from "./session";
import { settingsRouter } from "./settings";
import { terminalRouter } from "./terminal";
import { worktreeRouter } from "./worktree";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	features: featureRouter,
	learnings: learningRouter,
	projects: projectRouter,
	sessions: sessionRouter,
	agent: agentRouter,
	events: eventsRouter,
	autoMode: autoModeRouter,
	worktrees: worktreeRouter,
	pipeline: pipelineRouter,
	terminal: terminalRouter,
	settings: settingsRouter,
	notifications: notificationsRouter,
	github: githubRouter,
	fs: fsRouter,
	models: modelsRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
