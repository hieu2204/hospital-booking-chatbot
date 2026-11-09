// Chụp màn hình giao diện bằng Chromium không giao diện. Chạy trong container cùng mạng với frontend.
import fs from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = "http://frontend:5173";
const OUT = "/work/out";
const only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--lang=vi-VN"],
});

async function token(phone) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password: "demo1234" }),
  });
  return (await res.json()).access_token;
}

const patient = await token("0900000002");
const admin = await token("0900000001");

async function shot(name, { path, width = 1440, height = 900, auth, full = true, before, after }) {
  if (only.length && !only.includes(name)) return;
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate((value) => {
    localStorage.clear();
    if (value) localStorage.setItem("token", value);
  }, auth ?? null);
  if (before) await before(page);
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  if (after) await after(page);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  await page.close();
  console.log("ok", name);
}

const clickText = async (page, selector, text) => {
  await page.evaluate(
    (sel, t) => [...document.querySelectorAll(sel)].find((el) => el.textContent.includes(t))?.click(),
    selector,
    text,
  );
  await new Promise((r) => setTimeout(r, 900));
};

await shot("home", { path: "/" });
await shot("home-mobile", { path: "/", width: 390, height: 844 });
await shot("chat", {
  path: "/",
  full: false,
  after: async (page) => {
    await clickText(page, "button", "Hỏi trợ lý ảo");
    await page.type("textarea", "Bố tôi bị đau ngực dữ dội");
    await page.keyboard.press("Enter");
    await new Promise((r) => setTimeout(r, 2500));
  },
});
await shot("login", { path: "/login" });
await shot("booking", {
  path: "/booking",
  auth: patient,
  after: async (page) => {
    await clickText(page, "button", "Tiêu hóa");
    await new Promise((r) => setTimeout(r, 1200));
    await page.evaluate(() => [...document.querySelectorAll("button")].find((b) => /^\d\d:\d\d/.test(b.textContent))?.click());
    await new Promise((r) => setTimeout(r, 800));
  },
});
await shot("appointments", { path: "/appointments", auth: patient });
await shot("profiles", { path: "/profiles", auth: patient });
await shot("admin-login", { path: "/admin/login", full: false });
await shot("admin", { path: "/admin", auth: admin });
await shot("admin-sessions", { path: "/admin/sessions", auth: admin });

await browser.close();
