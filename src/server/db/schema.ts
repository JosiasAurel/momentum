import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  isProfilePublic: boolean("is_profile_public").notNull().default(false),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "stalling",
  "done",
]);

export const reminderEventStatusEnum = pgEnum("reminder_event_status", [
  "pending",
  "processing",
  "sent",
  "failed",
  "cancelled",
]);

export const reminderAuditActionEnum = pgEnum("reminder_audit_action", [
  "planned",
  "claimed",
  "sent",
  "failed",
  "cancelled",
  "skipped",
]);

export const folder = pgTable("folder", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const project = pgTable("project", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  folderId: text("folder_id")
    .notNull()
    .references(() => folder.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const task = pgTable(
  "task",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    status: taskStatusEnum("status").notNull().default("todo"),
    isActive: boolean("is_active").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("task_single_active_per_user")
      .on(table.userId)
      .where(sql`${table.isActive} = true`),
  ],
);

export const devlog = pgTable(
  "devlog",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("devlog_project_created_idx").on(table.projectId, table.createdAt),
    index("devlog_user_created_idx").on(table.userId, table.createdAt),
    index("devlog_public_created_idx").on(table.isPublic, table.createdAt),
  ],
);

export const devlogAttachment = pgTable(
  "devlog_attachment",
  {
    id: text("id").primaryKey(),
    devlogId: text("devlog_id")
      .notNull()
      .references(() => devlog.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    originalFilename: text("original_filename").notNull(),
    storageKey: text("storage_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    publicUrl: text("public_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("devlog_attachment_devlog_created_idx").on(table.devlogId, table.createdAt),
    uniqueIndex("devlog_attachment_storage_key_unique").on(table.storageKey),
  ],
);

export const reminderEvent = pgTable(
  "reminder_event",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    dueSnapshotAt: timestamp("due_snapshot_at", { withTimezone: true }).notNull(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),
    minutesBeforeDue: integer("minutes_before_due").notNull(),
    status: reminderEventStatusEnum("status").notNull().default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    idempotencyKey: text("idempotency_key").notNull(),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("reminder_event_idempotency_key_unique").on(table.idempotencyKey),
    index("reminder_event_status_scheduled_for_idx").on(table.status, table.scheduledFor),
    index("reminder_event_task_idx").on(table.taskId),
  ],
);

export const reminderEventAudit = pgTable(
  "reminder_event_audit",
  {
    id: text("id").primaryKey(),
    reminderEventId: text("reminder_event_id")
      .notNull()
      .references(() => reminderEvent.id, { onDelete: "cascade" }),
    action: reminderAuditActionEnum("action").notNull(),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("reminder_event_audit_event_idx").on(table.reminderEventId, table.createdAt)],
);

export const overdueRescheduleEvent = pgTable(
  "overdue_reschedule_event",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => task.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    overdueDueAt: timestamp("overdue_due_at", { withTimezone: true }).notNull(),
    rescheduledDueAt: timestamp("rescheduled_due_at", { withTimezone: true }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("overdue_reschedule_event_task_overdue_unique").on(table.taskId, table.overdueDueAt),
    uniqueIndex("overdue_reschedule_event_idempotency_key_unique").on(table.idempotencyKey),
    index("overdue_reschedule_event_user_created_idx").on(table.userId, table.createdAt),
  ],
);
