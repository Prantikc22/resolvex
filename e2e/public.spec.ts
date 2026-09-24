import { expect, test } from "@playwright/test";

test("marketing page presents the ResolveX 2.0 promise without fabricated proof", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Your customers reach out. ResolveX gets it done.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Get Started Free" }).first(),
  ).toHaveAttribute("href", "/signup");
  await expect(
    page.getByText("Trusted by teams at 100+ companies."),
  ).toHaveCount(0);
});

test("public demo remains usable", async ({ page }) => {
  await page.goto("/demo");
  await expect(
    page.getByRole("heading", { name: "Priority inbox" }),
  ).toBeVisible();
  await expect(page.getByText("Interactive demo")).toBeVisible();
});

test("local chatbot test bench is available in development", async ({
  page,
}) => {
  await page.goto("/dev/chatbot");
  await expect(
    page.getByRole("heading", { name: "Chatbot test bench" }),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Ask a question...")).toBeVisible();
  await expect(page.getByText("Product demo")).toBeVisible();
});

test("private APIs reject anonymous access", async ({ request }) => {
  const employees = await request.get("/api/ai-employees");
  expect(employees.status()).toBe(401);
  const crm = await request.get("/api/crm");
  expect(crm.status()).toBe(401);
  const approvals = await request.get("/api/approvals");
  expect(approvals.status()).toBe(401);
});
