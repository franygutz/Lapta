import { test } from "node:test";
import assert from "node:assert/strict";
import { TelemetryDecoder } from "../src/protocol";
import { frameSchema } from "../src/domain";
test("alarmas sin sensores son válidas; capacidades y umbrales contradictorios se rechazan", () => {
  assert.equal(
    frameSchema.safeParse({ v: 1, seq: 1, faults: ["bms"] }).success,
    true,
  );
  assert.equal(
    frameSchema.safeParse({ v: 1, seq: 1, usableWh: 300, fullUsableWh: 256 })
      .success,
    false,
  );
  assert.equal(
    frameSchema.safeParse({
      v: 1,
      seq: 1,
      soc: 50,
      limits: { lowSoc: 20, criticalSoc: 80 },
    }).success,
    false,
  );
});
test("BLE reconstruye fragmentos con MTU mínimo y varias líneas", () => {
  const decoder = new TelemetryDecoder();
  const text = JSON.stringify({ v: 1, seq: 1, loadW: 32 }) + "\n";
  const result = [];
  for (let i = 0; i < text.length; i += 20)
    result.push(...decoder.push(text.slice(i, i + 20), 100));
  assert.equal(result.length, 1);
  assert.equal(result[0]?.loadW, 32);
  assert.equal(decoder.push(text + text, 200).length, 2);
});
test("descarta fragmentos antiguos y rechaza paquetes inválidos", () => {
  const decoder = new TelemetryDecoder();
  decoder.push("basura", 100);
  assert.equal(decoder.push('{"v":1,"seq":1,"soc":20}\n', 6001).length, 1);
  assert.throws(() => decoder.push('{"v":1,"seq":2,"soc":999}\n', 6002));
  assert.throws(() => decoder.push("x".repeat(8193)));
});
