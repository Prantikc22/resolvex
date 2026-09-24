import assert from "node:assert/strict";
import test from "node:test";
import {
  employeeTemplateIds,
  employeeTemplates,
} from "../src/lib/ai/employee-templates";

test("every employee template has safe, usable defaults", () => {
  for (const id of employeeTemplateIds) {
    const template = employeeTemplates[id];
    assert.ok(template.label.length >= 4);
    assert.ok(template.instructions.length >= 40);
    assert.ok(template.greeting.length >= 10);
    assert.ok(template.channels.length >= 1);
  }
});

test("only the intended templates enable voice by default", () => {
  assert.equal(employeeTemplates.receptionist.channels.includes("voice"), true);
  assert.equal(employeeTemplates.sales.channels.includes("voice"), true);
  assert.equal(employeeTemplates.support.channels.includes("voice"), false);
});
