ALTER TABLE `feature` ADD `last_completed_step` text;--> statement-breakpoint
ALTER TABLE `feature` ADD `retry_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `feature` ADD `last_failure_at` integer;