CREATE TABLE `event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`payload` text,
	`feature_id` text,
	`project_id` text,
	`session_id` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`tool_calls` text,
	`thinking_content` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `message_session_id_idx` ON `message` (`session_id`);--> statement-breakpoint
CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`read` integer DEFAULT false,
	`dismissed` integer DEFAULT false,
	`feature_id` text,
	`project_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notification_project_id_idx` ON `notification` (`project_id`);--> statement-breakpoint
CREATE TABLE `setting` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`scope` text NOT NULL,
	`scope_id` text,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setting_key_scope_idx` ON `setting` (`key`,`scope`,`scope_id`);--> statement-breakpoint
CREATE TABLE `worktree` (
	`id` text PRIMARY KEY NOT NULL,
	`feature_id` text NOT NULL,
	`branch_name` text NOT NULL,
	`path` text NOT NULL,
	`pr_number` integer,
	`pr_url` text,
	`pr_title` text,
	`pr_state` text,
	`pr_created_at` text,
	`created_at` integer NOT NULL,
	`removed_at` integer
);
--> statement-breakpoint
CREATE INDEX `worktree_feature_id_idx` ON `worktree` (`feature_id`);--> statement-breakpoint
ALTER TABLE `feature` ADD `use_worktree` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `feature` ADD `locked` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `feature` ADD `locked_by` text;--> statement-breakpoint
ALTER TABLE `feature` ADD `locked_at` integer;--> statement-breakpoint
ALTER TABLE `feature` ADD `pipeline_step` text;--> statement-breakpoint
ALTER TABLE `agent_session` ADD `sdk_session_id` text;--> statement-breakpoint
ALTER TABLE `agent_session` ADD `model` text DEFAULT 'sonnet';--> statement-breakpoint
ALTER TABLE `agent_session` ADD `is_running` integer DEFAULT false;--> statement-breakpoint
ALTER TABLE `agent_session` ADD `working_directory` text;--> statement-breakpoint
ALTER TABLE `agent_session` ADD `message_count` integer DEFAULT 0;