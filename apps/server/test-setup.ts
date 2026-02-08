// Test environment setup
// This file is preloaded before tests run to set up test environment variables

process.env.DATABASE_URL = "file:./apps/server/data/test.db";
process.env.BETTER_AUTH_SECRET =
	"test-secret-min-32-characters-long-for-testing";
process.env.BETTER_AUTH_URL = "http://localhost:3001";
process.env.CORS_ORIGIN = "http://localhost:3000";
process.env.NODE_ENV = "test";
process.env.CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
