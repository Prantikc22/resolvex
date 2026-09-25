import assert from "node:assert/strict";
import test from "node:test";
import { gmailMessageUrl } from "../src/lib/integrations/gmail-link";

test("gmail links open the connected mailbox, not browser account #0", () => {
  assert.equal(
    gmailMessageUrl({ threadId: "1a0d7f2a6b51f622" }, "ops+team@example.com"),
    "https://mail.google.com/mail/?authuser=ops%2Bteam%40example.com#all/1a0d7f2a6b51f622",
  );
});

test("gmail links fall back safely without a known mailbox or thread", () => {
  assert.equal(
    gmailMessageUrl({ messageId: "abc" }, null),
    "https://mail.google.com/mail/u/0/#all/abc",
  );
  assert.equal(gmailMessageUrl({}, "a@b.com"), null);
});
