const fs = require("fs");
const path = require("path");

// 🔹 Target folder
const FOLDER_PATH = path.resolve(
  __dirname,
  "../content/Mein-Domain/sub-domain/faridabad/To-Let-Service"
);

// 🔹 New locations array (FIXED)
const NEW_LOCATIONS = [
  { title: "House For Sale", path: "/", icon: "Home" },
  { title: "House For Rent", path: "/", icon: "Key" },
  { title: "Flat For Sale", path: "/", icon: "Building2" },
  { title: "Flat For Rent", path: "/", icon: "Building" },
  { title: "Shop For Rent", path: "/", icon: "Store" },
  { title: "Shop For Sale", path: "/", icon: "Store" },
  { title: "Plot For Sale", path: "/", icon: "Landmark" },
  { title: "Agriculture Land For Sale", path: "/", icon: "Tractor" },
  { title: "To-Let Service", path: "/", icon: "Handshake" },
  { title: "Commercial Property For Sale", path: "/", icon: "BriefcaseBusiness" }
];

// ✅ Safety check
if (!fs.existsSync(FOLDER_PATH)) {
  console.error("❌ Folder not found:", FOLDER_PATH);
  process.exit(1);
}

const files = fs.readdirSync(FOLDER_PATH).filter(f => f.endsWith(".json"));

let updatedCount = 0;

for (const file of files) {
  const filePath = path.join(FOLDER_PATH, file);

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const json = JSON.parse(raw);

    // ✅ Check locationsSection exists
    if (!json.locationsSection) {
      console.warn(`⚠️ locationsSection missing in ${file}`);
      continue;
    }

    // 🔁 REPLACE locations array
    json.locationsSection.locations = NEW_LOCATIONS;

    fs.writeFileSync(
      filePath,
      JSON.stringify(json, null, 2),
      "utf8"
    );

    updatedCount++;
    console.log(`✅ Updated: ${file}`);
  } catch (err) {
    console.error(`❌ Error in ${file}:`, err.message);
  }
}

console.log(`\n🎉 Done! Total files updated: ${updatedCount}`);