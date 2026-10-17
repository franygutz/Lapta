import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SCHEMA } from "../src/schema";
import { demo } from "../src/domain";
test("SQLite real: reapertura, preferencias, aislamiento de origen y orden cronológico", () => {
  const dir = mkdtempSync(join(tmpdir(), "lapta-test-"));
  const path = join(dir, "test.db");
  let db = new DatabaseSync(path);
  try {
    db.exec(SCHEMA);
    const insert = db.prepare(
      "INSERT INTO readings(time,source,device,payload) VALUES(?,?,?,?)",
    );
    const r = demo(2000, 1, "sol");
    insert.run(2000, "demo", r.device, JSON.stringify(r));
    insert.run(
      1000,
      "real",
      "ESP32",
      JSON.stringify({ ...r, time: 1000, source: "real", device: "ESP32" }),
    );
    db.prepare("INSERT OR REPLACE INTO preferences(key,value) VALUES(?,?)").run(
      "theme",
      "dark",
    );
    db.close();
    db = new DatabaseSync(path);
    assert.equal(
      db.prepare("SELECT value FROM preferences WHERE key=?").get("theme")
        ?.value,
      "dark",
    );
    const result = db
      .prepare(
        "SELECT payload FROM readings WHERE source=? AND time>=? ORDER BY time",
      )
      .all("demo", 0);
    assert.equal(result.length, 1);
    assert.equal(JSON.parse(String(result[0]?.payload)).source, "demo");
    assert.equal(
      db.prepare("SELECT device FROM readings ORDER BY time DESC LIMIT 1").get()
        ?.device,
      "LAPTA-DEMO",
    );
  } finally {
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
