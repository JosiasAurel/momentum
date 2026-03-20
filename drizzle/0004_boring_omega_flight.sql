CREATE TABLE "devlog" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devlog_attachment" (
	"id" text PRIMARY KEY NOT NULL,
	"devlog_id" text NOT NULL,
	"user_id" text NOT NULL,
	"original_filename" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"public_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "devlog" ADD CONSTRAINT "devlog_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devlog" ADD CONSTRAINT "devlog_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devlog_attachment" ADD CONSTRAINT "devlog_attachment_devlog_id_devlog_id_fk" FOREIGN KEY ("devlog_id") REFERENCES "public"."devlog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devlog_attachment" ADD CONSTRAINT "devlog_attachment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "devlog_project_created_idx" ON "devlog" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "devlog_user_created_idx" ON "devlog" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "devlog_public_created_idx" ON "devlog" USING btree ("is_public","created_at");--> statement-breakpoint
CREATE INDEX "devlog_attachment_devlog_created_idx" ON "devlog_attachment" USING btree ("devlog_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "devlog_attachment_storage_key_unique" ON "devlog_attachment" USING btree ("storage_key");