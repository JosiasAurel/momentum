import { env } from "@/env";
import { buildReminderEmailTemplate } from "@/server/reminders/templates";

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
  };
}
