import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [tailwindcss(), tanstackRouter({}), react()],
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
			},
		},
		server: {
			port: Number(env.VITE_PORT) || 3001,
			proxy: {
				"/ws": {
					target: env.VITE_SERVER_URL || "http://localhost:3008",
					ws: true,
					changeOrigin: true,
				},
				"/rpc": {
					target: env.VITE_SERVER_URL || "http://localhost:3008",
					changeOrigin: true,
				},
				"/api": {
					target: env.VITE_SERVER_URL || "http://localhost:3008",
					changeOrigin: true,
				},
				"/health": {
					target: env.VITE_SERVER_URL || "http://localhost:3008",
					changeOrigin: true,
				},
			},
		},
	};
});
