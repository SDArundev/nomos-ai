import { env } from "@nomos-ai/env/server";
import pino from "pino";

const isProduction = env.NODE_ENV === "production";

export const logger = pino({
	level: env.LOG_LEVEL,
	...(isProduction
		? {}
		: {
				transport: {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "HH:MM:ss",
						ignore: "pid,hostname",
					},
				},
			}),
});

/** Child loggers per service — include service name in all log lines */
export const serverLogger = logger.child({ service: "server" });
export const autoModeLogger = logger.child({ service: "auto-mode" });
export const pipelineLogger = logger.child({ service: "pipeline" });
export const sessionLogger = logger.child({ service: "session" });
export const agentLogger = logger.child({ service: "agent" });
export const eventLogger = logger.child({ service: "event" });
export const restLogger = logger.child({ service: "rest" });
