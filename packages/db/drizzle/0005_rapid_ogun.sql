CREATE TABLE "member_interests" (
	"member_id" text NOT NULL,
	"topic_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_interests_pk" PRIMARY KEY("member_id","topic_slug")
);
--> statement-breakpoint
CREATE TABLE "topics" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "embeddings" ALTER COLUMN "source_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "member_interests" ADD CONSTRAINT "member_interests_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_interests" ADD CONSTRAINT "member_interests_topic_slug_topics_slug_fk" FOREIGN KEY ("topic_slug") REFERENCES "public"."topics"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_interests_topic_idx" ON "member_interests" USING btree ("topic_slug");