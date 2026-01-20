import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import fs from "fs";

// ================= CONFIG =================
const URL = "https://www.99acres.com/commercial-shops-for-rent-in-sector-3a-gurgaon-ffid";

const TARGET_LOCATION = "Sector 3A";
const MAX_SAVE = 30;

// ============== HELPERS ==================
function normalizeText(t) {
  return String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePrice(text) {
  if (!text) return 0;
  let t = String(text).replace(/,/g, "").toLowerCase();

  let m = t.match(/(\d+(\.\d+)?)\s*(cr|crore)/);
  if (m) return Math.round(parseFloat(m[1]) * 10000000);

  m = t.match(/(\d+(\.\d+)?)\s*(lakh|lakhs)/);
  if (m) return Math.round(parseFloat(m[1]) * 100000);

  const n = parseInt(t.replace(/\D/g, ""));
  return isNaN(n) ? 0 : n;
}

// ✅ FIXED AREA PARSER (COMMA SAFE)
function parseArea(text) {
  if (!text) return 0;

  const clean = String(text)
    .replace(/,/g, "")
    .toLowerCase();

  const m = clean.match(/(\d+)\s*(sqft|sq ft|sqm|sq m)?/);
  return m ? parseInt(m[1]) : 0;
}

function parseIntSafe(v) {
  if (!v) return 0;
  const n = parseInt(String(v).replace(/\D/g, ""));
  return isNaN(n) ? 0 : n;
}

function extractBedroomsFromTitle(title) {
  const m = title.toLowerCase().match(/(\d+)\s*(bhk|bed)/);
  return m ? parseInt(m[1]) : 0;
}

// ⭐ PROPERTY TYPE
function detectPropertyType(text) {
  const t = text.toLowerCase();
  if (t.includes("independent house") || t.includes("house")) return "House";
  if (t.includes("villa")) return "Villa";
  if (t.includes("builder floor")) return "Builder Floor";
  if (t.includes("plot") || t.includes("land")) return "Plot";
  if (t.includes("apartment") || t.includes("flat")) return "Apartment";
  return "Property";
}

// ⭐ LISTING TYPE
function detectListingType(text) {
  const t = text.toLowerCase();
  if (t.includes("rent")) return "rent";
  if (t.includes("lease")) return "lease";
  return "sale";
}

// ⭐ SMART BATHROOM EXTRACTOR
function extractBathroomsSmart(text) {
  const m = text
    .toLowerCase()
    .match(/(\d+)\s*(bath|bathroom|toilet|washroom|wc)/);
  return m ? parseInt(m[1]) : 0;
}

// ================= MAIN ==================
(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process"
    ],
    ignoreHTTPSErrors: true
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  console.log("🌐 Opening page...");
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  try {
    await page.waitForSelector(".tupleNew__outerTupleWrap", { timeout: 60000 });
  } catch {
    console.log("❌ Cards not found. Maybe blocked.");
    await page.screenshot({ path: "blocked.png", fullPage: true });
    return;
  }

  // Scroll to load more
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 4000));

  const html = await page.content();
  const $ = cheerio.load(html);

  const cards = $(".tupleNew__outerTupleWrap");
  console.log("🧱 Cards found:", cards.length);

  const results = [];

  cards.each((i, card) => {
    if (results.length >= MAX_SAVE) return false;

    const title = $(card).find("h2").text().trim();
    if (!title) return;

    const cardText = $(card).text();
    const fullText = title + " " + cardText;

    if (!normalizeText(fullText).includes(normalizeText(TARGET_LOCATION))) return;

    const price = parsePrice($(card).find(".tupleNew__priceValWrap").text());
    const area = parseArea($(card).find(".tupleNew__areaWrap").text());

    const bedrooms = extractBedroomsFromTitle(title);
    const bathrooms = extractBathroomsSmart(fullText);

    let floor = 0;
    $(card).find(".tupleNew__unitHighlightTxt").each((i, el) => {
      const t = $(el).text().toLowerCase();
      if (t.includes("floor")) floor = parseIntSafe(t);
    });

    const amenities = [];
    $(card).find(".tupleNew__unitHighlightTxt").each((i, el) => {
      const t = $(el).text().trim();
      if (t) amenities.push(t);
    });

    const propertyType = detectPropertyType(fullText);
    const listingType = detectListingType(fullText);

    results.push({
      propertyCategory: "Commercial",
      propertyType,
      listingType,
      title,
      description: "",
      state: "Haryana",
      city: "gurgaon",
      locality: TARGET_LOCATION,
      pincode: "",
      bedrooms,
      bathrooms,
      furnishing: "",
      floor,
      area,
      areaUnit: "sqft",
      price,
      selectedAmenities: [...new Set(amenities)]
    });
  });

  // ================= SAVE FILE =================
  const OUTPUT_DIR = "./output";
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const safeName = normalizeText(TARGET_LOCATION).replace(/\s+/g, "-");
  const outputFile = `${OUTPUT_DIR}/${safeName}.json`;

  fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));

  await browser.close();

  console.log("✅ DONE");
  console.log("🏠 Properties saved:", results.length);
  console.log("📄 File saved:", outputFile);
})();
