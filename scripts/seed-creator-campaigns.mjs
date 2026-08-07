import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed creator campaigns.");
}

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("railway") && !process.env.DATABASE_URL.includes(".railway.internal") ? { rejectUnauthorized: false } : undefined,
});

const owner = {
  id: "seed-creator-campaign-owner",
  email: "seed-creator-campaign-owner@local.invalid",
  passwordHash: "local-seed-not-for-login",
};

const campaigns = [
  ["seed-campaign-vn-beauty", "VN Glow Serum Launch", "beauty", ["VN"], ["TikTok", "Instagram"], "Show a morning glow routine featuring the serum.", "USD 180 + product", "2030-03-10T00:00:00.000Z", "2030-03-31T00:00:00.000Z", 8],
  ["seed-campaign-vn-fashion", "Hanoi Linen Edit", "fashion", ["VN"], ["Instagram"], "Style a breathable linen look for city weekends.", "USD 220 + product", "2030-03-14T00:00:00.000Z", "2030-04-04T00:00:00.000Z", 6],
  ["seed-campaign-tw-beauty", "Taipei Barrier Care", "skincare", ["TW"], ["YouTube", "Instagram"], "Explain the three-step barrier care routine.", "USD 260 + product", "2030-03-12T00:00:00.000Z", "2030-04-02T00:00:00.000Z", 5],
  ["seed-campaign-tw-fashion", "Taiwan Street Layering", "fashion", ["TW"], ["TikTok"], "Create a short street-style layering video.", "USD 200 + product", "2030-03-18T00:00:00.000Z", "2030-04-08T00:00:00.000Z", 7],
  ["seed-campaign-us-beauty", "US Clean Makeup Drop", "beauty", ["US"], ["TikTok", "YouTube"], "Film a clean-makeup transition with the new palette.", "USD 350 + product", "2030-03-16T00:00:00.000Z", "2030-04-06T00:00:00.000Z", 10],
  ["seed-campaign-us-fashion", "Los Angeles Resort Layer", "fashion", ["US"], ["Instagram", "YouTube"], "Photograph a resort-layering outfit in natural light.", "USD 400 + product", "2030-03-20T00:00:00.000Z", "2030-04-10T00:00:00.000Z", 4],
];

const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(
    `INSERT INTO users (id, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = 'admin', updated_at = now()`,
    [owner.id, owner.email, owner.passwordHash],
  );
  for (const campaign of campaigns) {
    await client.query(
      `INSERT INTO campaigns
       (id, owner_type, owner_id, title, category, markets, platforms, brief, reward_text, application_deadline, content_deadline, slots, status)
       VALUES ($1, 'admin', $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8, $9::timestamptz, $10::timestamptz, $11, 'recruiting')
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         category = EXCLUDED.category,
         markets = EXCLUDED.markets,
         platforms = EXCLUDED.platforms,
         brief = EXCLUDED.brief,
         reward_text = EXCLUDED.reward_text,
         application_deadline = EXCLUDED.application_deadline,
         content_deadline = EXCLUDED.content_deadline,
         slots = EXCLUDED.slots,
         status = EXCLUDED.status,
         updated_at = now()`,
      [campaign[0], owner.id, campaign[1], campaign[2], JSON.stringify(campaign[3]), JSON.stringify(campaign[4]), campaign[5], campaign[6], campaign[7], campaign[8], campaign[9]],
    );
  }
  await client.query("COMMIT");
  console.log(`Seeded ${campaigns.length} creator campaigns.`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => {});
  throw error;
} finally {
  client.release();
  await pool.end();
}
