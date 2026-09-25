import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeCustomDomain,
  normalizeHost,
} from "../src/lib/help-center/domain";

test("normalizes customer-owned help-center hostnames", () => {
  assert.equal(
    normalizeCustomDomain("https://Help.Example.com/"),
    "help.example.com",
  );
  assert.equal(normalizeHost("HELP.EXAMPLE.COM:443"), "help.example.com");
});

test("rejects platform, IP, and path-based domains", () => {
  assert.throws(() => normalizeCustomDomain("www.getresolvex.com"));
  assert.throws(() => normalizeCustomDomain("127.0.0.1"));
  assert.throws(() => normalizeCustomDomain("help.example.com/docs"));
});
