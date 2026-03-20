CREATE TYPE "public"."daily_momentum_email_status" AS ENUM('sent', 'failed');--> statement-breakpoint
CREATE TABLE "daily_momentum_email" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"recap_date" timestamp with time zone NOT NULL,
	"status" "daily_momentum_email_status" NOT NULL,
	"idempotency_key" text NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_plan_item" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"task_id" text NOT NULL,
	"plan_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_momentum_email" ADD CONSTRAINT "daily_momentum_email_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan_item" ADD CONSTRAINT "daily_plan_item_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_plan_item" ADD CONSTRAINT "daily_plan_item_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_momentum_email_idempotency_key_unique" ON "daily_momentum_email" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_momentum_email_user_date_unique" ON "daily_momentum_email" USING btree ("user_id","recap_date");--> statement-breakpoint
CREATE INDEX "daily_momentum_email_user_created_idx" ON "daily_momentum_email" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plan_item_user_task_date_unique" ON "daily_plan_item" USING btree ("user_id","task_id","plan_date");--> statement-breakpoint
CREATE INDEX "daily_plan_item_user_date_idx" ON "daily_plan_item" USING btree ("user_id","plan_date");