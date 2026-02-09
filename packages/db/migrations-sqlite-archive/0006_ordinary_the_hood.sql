DROP INDEX `project_path_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `project_user_path_unique` ON `project` (`user_id`,`path`);