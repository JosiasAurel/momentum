export function formatReminderWindow(minutesBeforeDue: number) {
  if (minutesBeforeDue <= 0) {
    return "now";
  }
  if (minutesBeforeDue % (24 * 60) === 0) {
    const days = minutesBeforeDue / (24 * 60);
    return `${days} day${days === 1 ? "" : "s"}`;
  }
  if (minutesBeforeDue % 60 === 0) {
    const hours = minutesBeforeDue / 60;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${minutesBeforeDue} minute${minutesBeforeDue === 1 ? "" : "s"}`;
}

export function buildReminderEmailTemplate(input: {
  appUrl: string;
  recipientName: string;
  taskTitle: string;
  dueAt: Date;
  minutesBeforeDue: number;
}) {
  const windowLabel = formatReminderWindow(input.minutesBeforeDue);
  const dueLabel = input.dueAt.toUTCString();

  const subject =
    input.minutesBeforeDue <= 0
      ? `Task due now: ${input.taskTitle}`
      : `Task due in ${windowLabel}: ${input.taskTitle}`;

  const text = [
    `Hi ${input.recipientName},`,
    "",
    `Reminder: \"${input.taskTitle}\" is due ${windowLabel === "now" ? "now" : `in ${windowLabel}`}.`,
    `Due at: ${dueLabel}`,
    "",
    `Open your workspace: ${input.appUrl}/dashboard`,
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(input.recipientName)},</p>`,
    `<p><strong>${escapeHtml(input.taskTitle)}</strong> is due ${
      windowLabel === "now" ? "now" : `in ${escapeHtml(windowLabel)}`
    }.</p>`,
    `<p>Due at: ${escapeHtml(dueLabel)}</p>`,
    `<p><a href="${escapeHtml(input.appUrl)}/dashboard">Open your workspace dashboard</a></p>`,
  ].join("");

  return { subject, text, html };
}

export function buildDailyMomentumEmailTemplate(input: {
  appUrl: string;
  recipientName: string;
  recapDate: Date;
  completedYesterday: Array<{ title: string }>;
  plannedToday: Array<{ title: string; dueAt: Date | null }>;
}) {
  const recapLabel = input.recapDate.toUTCString();
  const completedLines =
    input.completedYesterday.length > 0
      ? input.completedYesterday.map((item, index) => `${index + 1}. ${item.title}`)
      : ["No tasks were marked complete yesterday."];
  const plannedLines =
    input.plannedToday.length > 0
      ? input.plannedToday.map((item, index) => {
          const dueLabel = item.dueAt ? ` (due ${item.dueAt.toUTCString()})` : "";
          return `${index + 1}. ${item.title}${dueLabel}`;
        })
      : ["No plan is set for today yet."];

  const subject = `Momentum recap for ${recapLabel}`;
  const text = [
    `Hi ${input.recipientName},`,
    "",
    `Your Momentum UTC recap for ${recapLabel}.`,
    "",
    "Completed yesterday:",
    ...completedLines,
    "",
    "Planned for today:",
    ...plannedLines,
    "",
    `Open dashboard: ${input.appUrl}/dashboard`,
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(input.recipientName)},</p>`,
    `<p>Your Momentum UTC recap for <strong>${escapeHtml(recapLabel)}</strong>.</p>`,
    "<p><strong>Completed yesterday</strong></p>",
    `<ul>${completedLines.map((line) => `<li>${escapeHtml(line.replace(/^\d+\.\s*/, ""))}</li>`).join("")}</ul>`,
    "<p><strong>Planned for today</strong></p>",
    `<ul>${plannedLines.map((line) => `<li>${escapeHtml(line.replace(/^\d+\.\s*/, ""))}</li>`).join("")}</ul>`,
    `<p><a href="${escapeHtml(input.appUrl)}/dashboard">Open your workspace dashboard</a></p>`,
  ].join("");

  return { subject, text, html };
}

export function buildWorkSessionInviteEmailTemplate(input: {
  appUrl: string;
  recipientName: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  tags: string[];
}) {
  const startLabel = input.startsAt.toUTCString();
  const endLabel = input.endsAt.toUTCString();
  const tagsLabel = input.tags.length > 0 ? input.tags.join(", ") : "No tags";
  const subject = `Work session invite: ${input.title}`;
  const text = [
    `Hi ${input.recipientName},`,
    "",
    `Your work session \"${input.title}\" is scheduled.`,
    `Starts: ${startLabel}`,
    `Ends: ${endLabel}`,
    `Tags: ${tagsLabel}`,
    "",
    "Attached is an .ics invite file you can import into Google Calendar or another calendar app.",
    `Open dashboard: ${input.appUrl}/dashboard`,
  ].join("\n");

  const html = [
    `<p>Hi ${escapeHtml(input.recipientName)},</p>`,
    `<p>Your work session <strong>${escapeHtml(input.title)}</strong> is scheduled.</p>`,
    `<p>Starts: ${escapeHtml(startLabel)}<br/>Ends: ${escapeHtml(endLabel)}<br/>Tags: ${escapeHtml(tagsLabel)}</p>`,
    "<p>The attached <code>.ics</code> file can be imported into Google Calendar or another calendar app.</p>",
    `<p><a href="${escapeHtml(input.appUrl)}/dashboard">Open your workspace dashboard</a></p>`,
  ].join("");

  return { subject, text, html };
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
