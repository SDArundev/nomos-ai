CREATE TABLE `feature` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`phase` text NOT NULL,
	`priority` integer,
	`status` text NOT NULL,
	`passes` integer DEFAULT false NOT NULL,
	`acceptance_criteria` text NOT NULL,
	`requirements` text,
	`dependencies` text,
	`estimated_size` text,
	`model` text,
	`thinking_level` text,
	`planning_mode` text,
	`require_plan_approval` integer,
	`skip_tests` integer,
	`retries` integer DEFAULT 0,
	`description_history` text,
	`spec` text,
	`technical_notes` text,
	`testing_requirements` text,
	`files` text,
	`image_paths` text,
	`text_file_paths` text,
	`error` text,
	`summary` text,
	`plan_spec` text,
	`branch_name` text,
	`tags` text,
	`title_generating` integer,
	`started_at` integer,
	`completed_at` integer,
	`verified_at` integer,
	`completed_by` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feature_status_idx` ON `feature` (`status`);--> statement-breakpoint
CREATE INDEX `feature_phase_idx` ON `feature` (`phase`);--> statement-breakpoint
CREATE INDEX `feature_project_id_idx` ON `feature` (`project_id`);--> statement-breakpoint
CREATE TABLE `learning` (
	`id` text PRIMARY KEY NOT NULL,
	`feature_id` text,
	`category` text NOT NULL,
	`pattern` text,
	`anti_pattern` text,
	`context` text,
	`severity` text,
	`tags` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`feature_id`) REFERENCES `feature`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `learning_category_idx` ON `learning` (`category`);--> statement-breakpoint
CREATE INDEX `learning_feature_id_idx` ON `learning` (`feature_id`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_path_unique` ON `project` (`path`);--> statement-breakpoint
CREATE INDEX `project_name_idx` ON `project` (`name`);--> statement-breakpoint
CREATE TABLE `agent_session` (
	`id` text PRIMARY KEY NOT NULL,
	`feature_id` text NOT NULL,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`output` text,
	`error` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`feature_id`) REFERENCES `feature`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `agent_session_status_idx` ON `agent_session` (`status`);--> statement-breakpoint
CREATE INDEX `agent_session_feature_id_idx` ON `agent_session` (`feature_id`);