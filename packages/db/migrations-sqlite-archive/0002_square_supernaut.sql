DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "feature_status_idx";--> statement-breakpoint
DROP INDEX "feature_phase_idx";--> statement-breakpoint
DROP INDEX "feature_project_id_idx";--> statement-breakpoint
DROP INDEX "learning_category_idx";--> statement-breakpoint
DROP INDEX "learning_feature_id_idx";--> statement-breakpoint
DROP INDEX "project_path_unique";--> statement-breakpoint
DROP INDEX "project_name_idx";--> statement-breakpoint
DROP INDEX "agent_session_status_idx";--> statement-breakpoint
DROP INDEX "agent_session_feature_id_idx";--> statement-breakpoint
ALTER TABLE `project` ALTER COLUMN "settings" TO "settings" text NOT NULL DEFAULT '{"theme":"system","locale":"en","autoSaveInterval":30,"notifications":true}';--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `feature_status_idx` ON `feature` (`status`);--> statement-breakpoint
CREATE INDEX `feature_phase_idx` ON `feature` (`phase`);--> statement-breakpoint
CREATE INDEX `feature_project_id_idx` ON `feature` (`project_id`);--> statement-breakpoint
CREATE INDEX `learning_category_idx` ON `learning` (`category`);--> statement-breakpoint
CREATE INDEX `learning_feature_id_idx` ON `learning` (`feature_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `project_path_unique` ON `project` (`path`);--> statement-breakpoint
CREATE INDEX `project_name_idx` ON `project` (`name`);--> statement-breakpoint
CREATE INDEX `agent_session_status_idx` ON `agent_session` (`status`);--> statement-breakpoint
CREATE INDEX `agent_session_feature_id_idx` ON `agent_session` (`feature_id`);--> statement-breakpoint
ALTER TABLE `project` ADD `user_id` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `project` ADD `status` text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE `feature` ADD `user_id` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `feature` ADD `pre_implemented` integer;--> statement-breakpoint
ALTER TABLE `learning` ADD `user_id` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `agent_session` ADD `user_id` text NOT NULL DEFAULT '';