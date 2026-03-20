CREATE TYPE "public"."reminder_audit_action" AS ENUM('planned', 'claimed', 'sent', 'failed', 'cancelled', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."reminder_event_status" AS ENUM('pending', 'processing', 'sent', 'failed', 'cancelled');--> statement-breakpoint
CREATE TABLE "overdue_reschedule_event" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"overdue_due_at" timestamp with time zone NOT NULL,
	"rescheduled_due_at" timestamp with time zone NOT NULL,
	"idempotency_key" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_event" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"due_snapshot_at" timestamp with time zone NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"minutes_before_due" integer NOT NULL,
	"status" "reminder_event_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text NOT NULL,
	"provider_message_id" text,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reminder_event_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"reminder_event_id" text NOT NULL,
	"action" "reminder_audit_action" NOT NULL,
	"details" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_profile_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "overdue_reschedule_event" ADD CONSTRAINT "overdue_reschedule_event_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "overdue_reschedule_event" ADD CONSTRAINT "overdue_reschedule_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_event" ADD CONSTRAINT "reminder_event_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_event" ADD CONSTRAINT "reminder_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminder_event_audit" ADD CONSTRAINT "reminder_event_audit_reminder_event_id_reminder_event_id_fk" FOREIGN KEY ("reminder_event_id") REFERENCES "public"."reminder_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "overdue_reschedule_event_task_overdue_unique" ON "overdue_reschedule_event" USING btree ("task_id","overdue_due_at");--> statement-breakpoint
CREATE UNIQUE INDEX "overdue_reschedule_event_idempotency_key_unique" ON "overdue_reschedule_event" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "overdue_reschedule_event_user_created_idx" ON "overdue_reschedule_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_event_idempotency_key_unique" ON "reminder_event" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "reminder_event_status_scheduled_for_idx" ON "reminder_event" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE INDEX "reminder_event_task_idx" ON "reminder_event" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "reminder_event_audit_event_idx" ON "reminder_event_audit" USING btree ("reminder_event_id","created_at");