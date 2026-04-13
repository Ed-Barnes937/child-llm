import postgres from "postgres";

const DATABASE_URL = "postgres://childsafe:childsafe@localhost:5433/childsafe";

export async function resetDb() {
  const sql = postgres(DATABASE_URL);
  await sql`DELETE FROM presets`;
  await sql`DELETE FROM devices`;
  await sql`DELETE FROM children`;
  await sql`DELETE FROM account`;
  await sql`DELETE FROM session`;
  await sql`DELETE FROM verification`;
  await sql`DELETE FROM "user"`;
  await sql.end();
}
