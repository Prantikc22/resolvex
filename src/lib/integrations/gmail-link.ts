/**
 * Gmail's `/u/0/` is simply the first account signed in to the browser, so a
 * connected mailbox that is not account #0 lands on the wrong inbox and the
 * thread is dropped. Addressing the mailbox by email opens the right account.
 */
export function gmailMessageUrl(
  message: Record<string, unknown>,
  mailbox: string | null,
) {
  const threadId = String(
    message.threadId ?? message.thread_id ?? message.messageId ?? "",
  ).trim();
  if (!threadId) return null;
  const account = mailbox ? `?authuser=${encodeURIComponent(mailbox)}` : "u/0/";
  return `https://mail.google.com/mail/${account}#all/${encodeURIComponent(threadId)}`;
}
