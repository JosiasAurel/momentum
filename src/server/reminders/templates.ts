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
      ? `Momentum: task due now · ${input.taskTitle}`
      : `Momentum: task due in ${windowLabel} · ${input.taskTitle}`;

  const text = [
    `Hi ${input.recipientName},`,
    "",
    `Momentum reminder: "${input.taskTitle}" is due ${windowLabel === "now" ? "now" : `in ${windowLabel}`}.`,
    `Due at: ${dueLabel}`,
    "",
    `Open your Momentum dashboard: ${input.appUrl}/dashboard`,
  ].join("\n");

  const html = [
    '<div style="font-family: Bricolage Grotesque,Segoe UI,Arial,sans-serif;font-weight:600;background:#f4f8ef;padding:24px;">',
    '<div style="max-width:560px;margin:0 auto;border:1px solid #cad9bf;border-radius:16px;background:#fbfdf7;padding:20px;">',
    '<p style="margin:0 0 8px;color:#2c5a3d;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">Momentum reminder</p>',
    `<p style="margin:0 0 12px;color:#1f3928;">Hi ${escapeHtml(input.recipientName)},</p>`,
    `<h2 style="margin:0 0 10px;font-family: Fraunces,Georgia,serif;font-size:22px;color:#214230;">${escapeHtml(
      input.taskTitle,
    )}</h2>`,
    `<p style="margin:0 0 8px;color:#2e4d38;">Due ${windowLabel === "now" ? "now" : `in ${escapeHtml(windowLabel)}`}.</p>`,
    `<p style="margin:0 0 16px;color:#50664d;font-size:14px;">Due at: ${escapeHtml(dueLabel)}</p>`,
    `<a href="${escapeHtml(input.appUrl)}/dashboard" style="display:inline-block;background:#387548;color:#f8fdf5;text-decoration:none;padding:10px 14px;border-radius:10px;">Open Momentum dashboard</a>`,
    "</div>",
    "</div>",
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
