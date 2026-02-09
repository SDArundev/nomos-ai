CREATE TABLE "api_key" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_prefix" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_key_key_hash_unique" UNIQUE("key_hash")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" text,
	"feature_id" text,
	"project_id" text,
	"session_id" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"phase" text NOT NULL,
	"priority" integer,
	"status" text NOT NULL,
	"passes" boolean DEFAULT false NOT NULL,
	"acceptance_criteria" jsonb NOT NULL,
	"requirements" jsonb,
	"dependencies" jsonb,
	"estimated_size" text,
	"pre_implemented" boolean,
	"model" text,
	"thinking_level" text,
	"planning_mode" text,
	"require_plan_approval" boolean,
	"skip_tests" boolean,
	"retries" integer DEFAULT 0,
	"description_history" jsonb,
	"spec" text,
	"technical_notes" text,
	"testing_requirements" jsonb,
	"files" jsonb,
	"image_paths" jsonb,
	"text_file_paths" jsonb,
	"error" text,
	"summary" text,
	"plan_spec" jsonb,
	"branch_name" text,
	"use_worktree" boolean DEFAULT false,
	"locked" boolean DEFAULT false,
	"locked_by" text,
	"locked_at" timestamp with time zone,
	"pipeline_step" text,
	"last_completed_step" text,
	"retry_count" integer DEFAULT 0,
	"last_failure_at" timestamp with time zone,
	"tags" jsonb,
	"title_generating" boolean,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"completed_by" text,
	"release" text,
	"failure_reason" text,
	"restored_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"feature_id" text,
	"category" text NOT NULL,
	"pattern" text,
	"anti_pattern" text,
	"context" jsonb,
	"severity" text,
	"tags" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tool_calls" jsonb,
	"thinking_content" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"read" boolean DEFAULT false,
	"dismissed" boolean DEFAULT false,
	"feature_id" text,
	"project_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"path" text NOT NULL,
	"settings" jsonb DEFAULT '{"theme":"system","locale":"en","autoSaveInterval":30,"notifications":true}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"feature_id" text,
	"project_id" text,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"output" text,
	"error" text,
	"sdk_session_id" text,
	"model" text DEFAULT 'sonnet',
	"is_running" boolean DEFAULT false,
	"working_directory" text,
	"message_count" integer DEFAULT 0,
	"total_cost_usd" numeric(10, 6),
	"input_tokens" integer,
	"output_tokens" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "setting" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"scope" text NOT NULL,
	"scope_id" text,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worktree" (
	"id" text PRIMARY KEY NOT NULL,
	"feature_id" text NOT NULL,
	"branch_name" text NOT NULL,
	"path" text NOT NULL,
	"pr_number" integer,
	"pr_url" text,
	"pr_title" text,
	"pr_state" text,
	"pr_created_at" text,
	"created_at" timestamp with time zone NOT NULL,
	"removed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "api_key" ADD CONSTRAINT "api_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_feature_id_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."feature"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_session_id_agent_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature" ADD CONSTRAINT "feature_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning" ADD CONSTRAINT "learning_feature_id_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."feature"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_session_id_agent_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."agent_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_feature_id_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."feature"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_session" ADD CONSTRAINT "agent_session_feature_id_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "worktree" ADD CONSTRAINT "worktree_feature_id_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "api_key_userId_idx" ON "api_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_key_keyHash_idx" ON "api_key" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "feature_status_idx" ON "feature" USING btree ("status");--> statement-breakpoint
CREATE INDEX "feature_phase_idx" ON "feature" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "feature_project_id_idx" ON "feature" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "learning_category_idx" ON "learning" USING btree ("category");--> statement-breakpoint
CREATE INDEX "learning_feature_id_idx" ON "learning" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "message_session_id_idx" ON "message" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "notification_project_id_idx" ON "notification" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_user_path_unique" ON "project" USING btree ("user_id","path");--> statement-breakpoint
CREATE INDEX "project_name_idx" ON "project" USING btree ("name");--> statement-breakpoint
CREATE INDEX "agent_session_status_idx" ON "agent_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_session_feature_id_idx" ON "agent_session" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "agent_session_user_id_idx" ON "agent_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "setting_key_scope_idx" ON "setting" USING btree ("key","scope","scope_id");--> statement-breakpoint
CREATE INDEX "worktree_feature_id_idx" ON "worktree" USING btree ("feature_id");