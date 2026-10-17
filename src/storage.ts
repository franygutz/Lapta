import * as SQLite from "expo-sqlite";
import { Reading, Source } from "./domain";
import { SCHEMA } from "./schema";
let promise: Promise<SQLite.SQLiteDatabase> | undefined;
export function database() {
  return (promise ??= (async () => {
    const db = await SQLite.openDatabaseAsync("lapta.db");
    await db.execAsync(SCHEMA);
    return db;
  })().catch((e) => {
    promise = undefined;
    throw e;
  }));
}
export async function saveReading(r: Reading) {
  const db = await database();
  await db.runAsync(
    "INSERT INTO readings(time,source,device,payload) VALUES(?,?,?,?)",
    r.time,
    r.source,
    r.device,
    JSON.stringify(r),
  );
}
export async function history(
  source: Source,
  since: number,
  device?: string,
): Promise<Reading[]> {
  const db = await database();
  const rows = device
    ? await db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM readings WHERE source=? AND time>=? AND device=? ORDER BY time",
        source,
        since,
        device,
      )
    : await db.getAllAsync<{ payload: string }>(
        "SELECT payload FROM readings WHERE source=? AND time>=? ORDER BY time",
        source,
        since,
      );
  return rows.map((r) => JSON.parse(r.payload) as Reading);
}
export async function latest(source: Source) {
  const db = await database();
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM readings WHERE source=? ORDER BY time DESC LIMIT 1",
    source,
  );
  return row ? (JSON.parse(row.payload) as Reading) : undefined;
}
export async function preference(key: string, value?: string) {
  const db = await database();
  if (value !== undefined) {
    await db.runAsync(
      "INSERT OR REPLACE INTO preferences(key,value) VALUES(?,?)",
      key,
      value,
    );
    return value;
  }
  return (
    await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM preferences WHERE key=?",
      key,
    )
  )?.value;
}
export async function seedDemo() {
  const db = await database();
  const found = await db.getFirstAsync(
    "SELECT id FROM readings WHERE source=? LIMIT 1",
    "demo",
  );
  if (found) return;
  const { demo } = await import("./domain");
  let prev: Reading | undefined;
  const end = Date.now() - 2000;
  const start = end - 3 * 3600000;
  await db.withTransactionAsync(async () => {
    for (let t = start; t <= end; t += 10000) {
      prev = demo(t, Math.round((t - start) / 10000), "sol", prev);
      await saveReading(prev);
    }
  });
}
