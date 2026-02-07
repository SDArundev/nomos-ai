PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_agent_session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`feature_id` text,
	`project_id` text,
	`status` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`output` text,
	`error` text,
	`sdk_session_id` text,
	`model` text DEFAULT 'sonnet',
	`is_running` integer DEFAULT false,
	`working_directory` text,
	`message_count` integer DEFAULT 0,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`feature_id`) REFERENCES `feature`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_agent_session`("id", "user_id", "feature_id", "project_id", "status", "started_at", "completed_at", "output", "error", "sdk_session_id", "model", "is_running", "working_directory", "message_count", "created_at", "updated_at") SELECT "id", "user_id", "feature_id", NULL, "status", "started_at", "completed_at", "output", "error", "sdk_session_id", "model", "is_running", "working_directory", "message_count", "created_at", "updated_at" FROM `agent_session`;--> statement-breakpoint
DROP TABLE `agent_session`;--> statement-breakpoint
ALTER TABLE `__new_agent_session` RENAME TO `agent_session`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `agent_session_status_idx` ON `agent_session` (`status`);--> statement-breakpoint
CREATE INDEX `agent_session_feature_id_idx` ON `agent_session` (`feature_id`);