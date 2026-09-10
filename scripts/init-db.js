// Applies database.sql to whatever DATABASE_URL points at.
// Run with: npm run db:init
//
// Uses the project's own pg connection, so you do not need psql installed.
// database.sql has plain CREATE TABLE statements, so this is a one-shot
// initialiser: running it twice fails with "already exists", which is the
// correct, loud behaviour for a schema file.
const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");

async function main() {
  const target = process.env.DATABASE_URL;
  if (!target) {
    throw new Error("DATABASE_URL is not set — check your .env");
  }

  // Log the host only. The connection string carries a password.
  console.log(`Applying database.sql to ${new URL(target).host}`);

  const schema = fs.readFileSync(
    path.join(__dirname, "..", "database.sql"),
    "utf8"
  );

  await pool.query(schema);
  console.log("✅ Schema applied");
}

main()
  .catch((error) => {
    console.error("❌ Failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
