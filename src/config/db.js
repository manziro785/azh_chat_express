// PostgreSQL database connection configuration
const { Pool } = require("pg");
require("dotenv").config();

// Neon (like any hosted Postgres) refuses plaintext connections. This used to
// be keyed off NODE_ENV: if the host didn't set NODE_ENV=production, SSL was
// silently disabled and every connection failed with a confusing error.
// The connection target decides instead — only a local database goes without.
const isLocalDatabase = (url) => /@(localhost|127\.0\.0\.1)[:/]/.test(url);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isLocalDatabase(process.env.DATABASE_URL)
        ? false
        : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      // Neon's free compute suspends after ~5 minutes of inactivity. The first
      // connection after that has to wake it up, which takes several seconds —
      // the old 2s timeout turned every cold start into a failed request.
      connectionTimeoutMillis: 15000,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

// Errors on idle clients are normal with a database that suspends when idle:
// Neon drops the connection, pg removes that client from the pool and moves on.
// This used to call process.exit(-1), which killed the whole server — sockets,
// logged-in users and all — every time the database went to sleep.
pool.on("error", (err) => {
  console.error("Idle client error (connection dropped):", err.message);
});

// Query helper function
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
};

module.exports = {
  pool,
  query,
};
