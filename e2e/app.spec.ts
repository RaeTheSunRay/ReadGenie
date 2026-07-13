import { test, expect } from "@playwright/test";

test("homepage loads with title and auth buttons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "ReadGenie" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign-Up" })).toBeVisible();
});

test("sign-up and login flow", async ({ page }) => {
  const email = `test${Date.now()}@school.com`;

  await page.goto("/signup");
  await page.getByLabel(/username/i).fill(email);
  await page.getByLabel(/^password$/i).fill("password123");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL("/login");

  await page.getByLabel(/username/i).fill(email);
  await page.getByLabel(/^password$/i).fill("password123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Add book title")).toBeVisible();
});

test("book dropdown shows starter books with authors", async ({ page }) => {
  await page.goto("/");
  const select = page.getByLabel("Select a book");
  await expect(select).toBeVisible();
  await expect(select.locator("option")).not.toHaveCount(1);
  await expect(select.locator("option", { hasText: "by J.K. Rowling" })).toHaveCount(1);
});

test("quiz loads 10 story questions without error", async ({ page }) => {
  const email = `quiztest${Date.now()}@school.com`;

  await page.goto("/signup");
  await page.getByLabel(/username/i).fill(email);
  await page.getByLabel(/^password$/i).fill("password123");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL("/login");
  await page.getByLabel(/username/i).fill(email);
  await page.getByLabel(/^password$/i).fill("password123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Select a book")).toBeVisible();

  await page.getByLabel("Select a book").selectOption({ label: "Wonder by R.J. Palacio" });
  await page.getByRole("button", { name: "Start Quiz" }).click();

  await expect(page).toHaveURL(/\/quiz\?bookId=/);
  await expect(page.getByText("Answer all 10 questions")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("We could not find enough story questions")).not.toBeVisible();
  await expect(page.locator("legend")).toHaveCount(10);
});

test("quiz loads 10 story questions for Charlotte's Web", async ({ page }) => {
  const email = `charlotte${Date.now()}@school.com`;

  await page.goto("/signup");
  await page.getByLabel(/username/i).fill(email);
  await page.getByLabel(/^password$/i).fill("password123");
  await page.getByRole("button", { name: "Sign Up" }).click();

  await expect(page).toHaveURL("/login");
  await page.getByLabel(/username/i).fill(email);
  await page.getByLabel(/^password$/i).fill("password123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("Select a book")).toBeVisible();

  await page.getByLabel("Select a book").selectOption({ label: "Charlotte's Web by E.B. White" });
  await page.getByRole("button", { name: "Start Quiz" }).click();

  await expect(page).toHaveURL(/\/quiz\?bookId=/);
  await expect(page.getByText("We could not find enough story questions")).not.toBeVisible();
  await expect(page.locator("legend")).toHaveCount(10, { timeout: 15000 });
});

test("quiz API returns 422 for unknown book", async ({ request }) => {
  const email = `apitest${Date.now()}@school.com`;

  await request.post("/api/auth/signup", {
    data: { email, password: "password123" },
  });
  await request.post("/api/auth/login", {
    data: { email, password: "password123" },
  });

  const booksRes = await request.get("/api/books");
  const books = await booksRes.json();

  const res = await request.get(
    `/api/quiz?bookId=99999`
  );
  expect(res.status()).toBe(404);

  const wonder = books.find((b: { title: string }) => b.title === "Wonder");
  expect(wonder).toBeTruthy();

  const quizRes = await request.get(`/api/quiz?bookId=${wonder.id}`);
  expect(quizRes.status()).toBe(200);
  const quiz = await quizRes.json();
  expect(quiz.questions).toHaveLength(10);
});
