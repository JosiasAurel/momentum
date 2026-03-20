import { env } from "@/env";
import { buildWorkSessionIcs } from "@/server/reminders/calendar-invite";
import {
  buildDailyMomentumEmailTemplate,
  buildReminderEmailTemplate,
  buildWorkSessionInviteEmailTemplate,
} from "@/server/reminders/templates";

export type ReminderEmailPayload = {
  toEmail: string;
  toName: string;
  taskTitle: string;
  dueAt: Date;
  minutesBeforeDue: number;
  idempotencyKey: string;
};

export type ReminderSendResult = {
  providerMessageId: string | null;
};

export interface ReminderEmailSender {
  sendReminder(payload: ReminderEmailPayload): Promise<ReminderSendResult>;
  sendDailyMomentum(payload: {
    toEmail: string;
    toName: string;
    recapDate: Date;
    completedYesterday: Array<{ title: string }>;
    plannedToday: Array<{ title: string; dueAt: Date | null }>;
    idempotencyKey: string;
  }): Promise<ReminderSendResult>;
  sendCalendarInvite(payload: {
    toEmail: string;
    toName: string;
    sessionId: string;
    title: string;
    notes?: string | null;
    startsAt: Date;
    endsAt: Date;
    tags: string[];
    idempotencyKey: string;
  }): Promise<ReminderSendResult>;
}

export function createReminderEmailSender(input?: { dryRun?: boolean }): ReminderEmailSender {
  if (input?.dryRun) {
    return createDryRunReminderSender();
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return createDryRunReminderSender();
  }

  return createResendReminderSender({
    apiKey: env.RESEND_API_KEY,
    fromEmail: env.RESEND_FROM_EMAIL,
    appUrl: env.NEXT_PUBLIC_APP_URL,
  });
}

export function createDryRunReminderSender(): ReminderEmailSender {
  return {
    async sendReminder() {
      return { providerMessageId: "dry-run" };
    },
    async sendDailyMomentum() {
      return { providerMessageId: "dry-run" };
    },
    async sendCalendarInvite() {
      return { providerMessageId: "dry-run" };
    },
  };
}

export function createResendReminderSender(input: {
  apiKey: string;
  fromEmail: string;
  appUrl: string;
}): ReminderEmailSender {
  return {
    async sendReminder(payload) {
      const template = buildReminderEmailTemplate({
        appUrl: input.appUrl,
        recipientName: payload.toName,
        taskTitle: payload.taskTitle,
        dueAt: payload.dueAt,
        minutesBeforeDue: payload.minutesBeforeDue,
      });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": payload.idempotencyKey,
        },
        body: JSON.stringify({
          from: input.fromEmail,
          to: [payload.toEmail],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      const body = (await response.json()) as { id?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? `Resend returned ${response.status}`);
      }

      return {
        providerMessageId: body.id ?? null,
      };
    },
    async sendDailyMomentum(payload) {
      const template = buildDailyMomentumEmailTemplate({
        appUrl: input.appUrl,
        recipientName: payload.toName,
        recapDate: payload.recapDate,
        completedYesterday: payload.completedYesterday,
        plannedToday: payload.plannedToday,
      });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": payload.idempotencyKey,
        },
        body: JSON.stringify({
          from: input.fromEmail,
          to: [payload.toEmail],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      const body = (await response.json()) as { id?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? `Resend returned ${response.status}`);
      }

      return {
        providerMessageId: body.id ?? null,
      };
    },
    async sendCalendarInvite(payload) {
      const template = buildWorkSessionInviteEmailTemplate({
        appUrl: input.appUrl,
        recipientName: payload.toName,
        title: payload.title,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        tags: payload.tags,
      });

      const ics = buildWorkSessionIcs({
        uid: `work-session-${payload.sessionId}@momentum`,
        appUrl: input.appUrl,
        title: payload.title,
        notes: payload.notes,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        tags: payload.tags,
      });

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": payload.idempotencyKey,
        },
        body: JSON.stringify({
          from: input.fromEmail,
          to: [payload.toEmail],
          subject: template.subject,
          html: template.html,
          text: template.text,
          attachments: [
            {
              filename: "momentum-work-session.ics",
              content: Buffer.from(ics, "utf-8").toString("base64"),
            },
          ],
        }),
      });

      const body = (await response.json()) as { id?: string; message?: string };
      if (!response.ok) {
        throw new Error(body.message ?? `Resend returned ${response.status}`);
      }

      return {
        providerMessageId: body.id ?? null,
      };
    },
  };
}
