CREATE TABLE "creator_onboarding_sessions" (
	"user_id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"revision" integer NOT NULL,
	"state" jsonb NOT NULL,
	"completion_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator_onboarding_sessions" ADD CONSTRAINT "creator_onboarding_sessions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;