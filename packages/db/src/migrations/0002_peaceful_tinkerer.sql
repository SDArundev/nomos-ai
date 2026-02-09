ALTER TABLE "feature_metric" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_insight" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "antipattern" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "pattern" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "feature_metric" ADD CONSTRAINT "feature_metric_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_insight" ADD CONSTRAINT "feature_insight_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "antipattern" ADD CONSTRAINT "antipattern_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pattern" ADD CONSTRAINT "pattern_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_type_idx" ON "event" USING btree ("type");--> statement-breakpoint
CREATE INDEX "event_created_at_idx" ON "event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "event_project_type_idx" ON "event" USING btree ("project_id","type");--> statement-breakpoint
ALTER TABLE "feature" ADD CONSTRAINT "feature_status_enum" CHECK (status IN ('backlog', 'pending', 'in_progress', 'waiting_approval', 'verified', 'failed'));--> statement-breakpoint
ALTER TABLE "antipattern" ADD CONSTRAINT "severity_enum" CHECK (severity IN ('critical', 'high', 'medium', 'low'));--> statement-breakpoint
ALTER TABLE "pattern" ADD CONSTRAINT "confidence_range" CHECK (confidence >= 0 AND confidence <= 1);--> statement-breakpoint
ALTER TABLE "pattern" ADD CONSTRAINT "success_rate_range" CHECK (success_rate IS NULL OR (success_rate >= 0 AND success_rate <= 1));--> statement-breakpoint
ALTER TABLE "pattern" ADD CONSTRAINT "status_enum" CHECK (status IN ('active', 'proven', 'archived'));