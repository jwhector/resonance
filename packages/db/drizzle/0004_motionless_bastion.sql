CREATE TABLE "weave_evaluation_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"dimension" text NOT NULL,
	"score" integer NOT NULL,
	"rationale" text,
	CONSTRAINT "weave_evaluation_scores_score_range" CHECK (score between 0 and 3)
);
--> statement-breakpoint
CREATE TABLE "weave_evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_release_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"flow_id" text NOT NULL,
	"evidence_source" text NOT NULL,
	"evaluated_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weave_limitation_verdicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"limitation_id" text NOT NULL,
	"held" boolean NOT NULL,
	"evidence" text
);
--> statement-breakpoint
CREATE TABLE "weave_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"os_release_id" text NOT NULL,
	"conversation_id" text NOT NULL,
	"flow_id" text NOT NULL,
	"stage_id" text,
	"category" text NOT NULL,
	"signal" text NOT NULL,
	"detail" text,
	"evidence_source" text NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weave_pattern_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_id" uuid NOT NULL,
	"observation_id" uuid NOT NULL,
	"stance" text NOT NULL,
	"note" text,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weave_patterns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern_id" text NOT NULL,
	"lifecycle_status" text NOT NULL,
	"discovered_during" text,
	"last_reviewed_at" timestamp with time zone,
	"discovered_in_flows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discovered_in_stages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_scope_hypothesis" text,
	"observation" text NOT NULL,
	"possible_signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"candidate_responses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_confidence" text NOT NULL,
	"evidence_metrics" jsonb NOT NULL,
	"observed_outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence_notes" text DEFAULT '' NOT NULL,
	"candidate_promotions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"classification_scores" jsonb NOT NULL,
	"classification_rationale" text DEFAULT '' NOT NULL,
	"promotion_readiness" text DEFAULT 'not_ready' NOT NULL,
	"recommended_target" text,
	"promotion_decision" text DEFAULT 'pending' NOT NULL,
	"promoted_id" text,
	"promoted_version" text,
	"decision_rationale" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "weave_evaluation_scores" ADD CONSTRAINT "weave_evaluation_scores_evaluation_id_weave_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."weave_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weave_limitation_verdicts" ADD CONSTRAINT "weave_limitation_verdicts_evaluation_id_weave_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."weave_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weave_pattern_evidence" ADD CONSTRAINT "weave_pattern_evidence_pattern_id_weave_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."weave_patterns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weave_pattern_evidence" ADD CONSTRAINT "weave_pattern_evidence_observation_id_weave_observations_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."weave_observations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "weave_evaluation_scores_dimension_uq" ON "weave_evaluation_scores" USING btree ("evaluation_id","dimension");--> statement-breakpoint
CREATE INDEX "weave_evaluation_scores_dimension_idx" ON "weave_evaluation_scores" USING btree ("dimension");--> statement-breakpoint
CREATE INDEX "weave_evaluations_release_idx" ON "weave_evaluations" USING btree ("os_release_id");--> statement-breakpoint
CREATE INDEX "weave_evaluations_conversation_idx" ON "weave_evaluations" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "weave_evaluations_flow_idx" ON "weave_evaluations" USING btree ("flow_id");--> statement-breakpoint
CREATE INDEX "weave_evaluations_source_idx" ON "weave_evaluations" USING btree ("evidence_source");--> statement-breakpoint
CREATE UNIQUE INDEX "weave_limitation_verdicts_limitation_uq" ON "weave_limitation_verdicts" USING btree ("evaluation_id","limitation_id");--> statement-breakpoint
CREATE INDEX "weave_limitation_verdicts_breach_idx" ON "weave_limitation_verdicts" USING btree ("limitation_id","held");--> statement-breakpoint
CREATE INDEX "weave_observations_release_idx" ON "weave_observations" USING btree ("os_release_id");--> statement-breakpoint
CREATE INDEX "weave_observations_conversation_idx" ON "weave_observations" USING btree ("conversation_id","observed_at");--> statement-breakpoint
CREATE INDEX "weave_observations_flow_stage_idx" ON "weave_observations" USING btree ("flow_id","stage_id");--> statement-breakpoint
CREATE INDEX "weave_observations_category_signal_idx" ON "weave_observations" USING btree ("category","signal");--> statement-breakpoint
CREATE INDEX "weave_observations_source_idx" ON "weave_observations" USING btree ("evidence_source");--> statement-breakpoint
CREATE UNIQUE INDEX "weave_pattern_evidence_uq" ON "weave_pattern_evidence" USING btree ("pattern_id","observation_id");--> statement-breakpoint
CREATE INDEX "weave_pattern_evidence_stance_idx" ON "weave_pattern_evidence" USING btree ("pattern_id","stance");--> statement-breakpoint
CREATE INDEX "weave_pattern_evidence_observation_idx" ON "weave_pattern_evidence" USING btree ("observation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "weave_patterns_pattern_id_uq" ON "weave_patterns" USING btree ("pattern_id");--> statement-breakpoint
CREATE INDEX "weave_patterns_lifecycle_idx" ON "weave_patterns" USING btree ("lifecycle_status");--> statement-breakpoint
CREATE INDEX "weave_patterns_decision_idx" ON "weave_patterns" USING btree ("promotion_decision");--> statement-breakpoint
CREATE INDEX "weave_patterns_confidence_idx" ON "weave_patterns" USING btree ("evidence_confidence");