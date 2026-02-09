CREATE TABLE "feature_metric" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"feature_id" text NOT NULL,
	"duration_minutes" integer,
	"files_changed" integer,
	"lines_added" integer,
	"lines_removed" integer,
	"commits" integer,
	"retries" integer DEFAULT 0,
	"risk_level" text,
	"outcome" text,
	"started_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_metric_feature_id_unique" UNIQUE("feature_id")
);
--> statement-breakpoint
CREATE TABLE "feature_insight" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"feature_id" text NOT NULL,
	"acceptance_criteria" jsonb,
	"discoveries" jsonb,
	"patterns_applied" jsonb,
	"what_worked" jsonb,
	"what_failed" jsonb,
	"what_could_improve" jsonb,
	"recommendations" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "antipattern" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"evidence_count" integer DEFAULT 0,
	"prevention" text,
	"what_went_wrong" text,
	"lesson" text,
	"fix_applied" text,
	"last_seen" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pattern" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"evidence_count" integer DEFAULT 0,
	"success_rate" real DEFAULT 0,
	"risk_if_ignored" text,
	"code_example" text,
	"recommendation" text,
	"applies_to" jsonb,
	"features_applied" jsonb,
	"features_succeeded" jsonb,
	"first_seen" text,
	"last_seen" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "feature_metric" ADD CONSTRAINT "feature_metric_feature_id_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_insight" ADD CONSTRAINT "feature_insight_feature_id_feature_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."feature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feature_metric_feature_id_idx" ON "feature_metric" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "feature_metric_user_id_idx" ON "feature_metric" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feature_metric_outcome_idx" ON "feature_metric" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "feature_insight_feature_id_idx" ON "feature_insight" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "feature_insight_user_id_idx" ON "feature_insight" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "antipattern_category_idx" ON "antipattern" USING btree ("category");--> statement-breakpoint
CREATE INDEX "antipattern_user_id_idx" ON "antipattern" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "antipattern_severity_idx" ON "antipattern" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "pattern_category_idx" ON "pattern" USING btree ("category");--> statement-breakpoint
CREATE INDEX "pattern_user_id_idx" ON "pattern" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pattern_confidence_idx" ON "pattern" USING btree ("confidence");