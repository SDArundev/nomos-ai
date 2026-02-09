import client from "prom-client";

// Collect default Node.js process metrics (CPU, memory, event loop)
client.collectDefaultMetrics();

export const featuresTotal = new client.Gauge({
	name: "nomos_features_total",
	help: "Total number of features by status",
	labelNames: ["status"] as const,
});

export const sessionsTotal = new client.Gauge({
	name: "nomos_sessions_total",
	help: "Total number of sessions by status",
	labelNames: ["status"] as const,
});

export const pipelineDuration = new client.Histogram({
	name: "nomos_pipeline_duration_seconds",
	help: "Pipeline execution time in seconds",
	buckets: [10, 30, 60, 120, 300, 600, 1800],
});

export const requestDuration = new client.Histogram({
	name: "nomos_api_request_duration_seconds",
	help: "HTTP request latency in seconds",
	labelNames: ["method", "path", "status"] as const,
	buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

export const activePipelines = new client.Gauge({
	name: "nomos_active_pipelines",
	help: "Number of currently running pipelines",
});

export const costTotal = new client.Counter({
	name: "nomos_cost_usd_total",
	help: "Total USD cost spent on AI operations",
});

export const registry = client.register;
