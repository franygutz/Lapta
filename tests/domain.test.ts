import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alerts,
  autonomy,
  batteryPower,
  batteryState,
  chargeHours,
  demo,
  frameSchema,
  integrate,
  solar,
} from "../src/domain";
test("modo pitch acelera el modelo sin alterar las potencias medidas", () => {
  const initial = demo(1000, 1, "noche");
  const normal = demo(3000, 2, "noche", initial, 1);
  const pitch = demo(3000, 2, "noche", initial, 360);
  assert.equal(pitch.loadW, normal.loadW);
  assert.ok(pitch.soc! < initial.soc! - 3);
  assert.ok(
    Math.abs(
      (initial.usableWh! - pitch.usableWh!) /
        (initial.usableWh! - normal.usableWh!) -
        360,
    ) < 1e-8,
  );
  const a = { ...initial, demoRate: 360 };
  const energy = integrate([a, pitch]);
  assert.ok(Math.abs(energy.consumed - (48 * 720) / 3600) < 1e-8);
  assert.equal(integrate([initial, pitch]).seconds, 0);
  assert.ok(pitch.soc! >= 0 && pitch.soc! <= 100);
});
test("la aceleración nunca se aplica a lecturas reales", () => {
  const a = {
    ...demo(1000, 1, "noche"),
    source: "real" as const,
    demoRate: 360,
  };
  const b = { ...a, time: 3000 };
  assert.ok(Math.abs(integrate([a, b]).consumed - (48 * 2) / 3600) < 1e-8);
});
test("los consumos y cargas menores de un vatio conservan sus estimaciones", () => {
  const r = {
    ...demo(1000, 1, "sol"),
    loadW: 0.5,
    batteryV: 10,
    batteryA: 0.05,
  };
  assert.equal(autonomy(r), r.usableWh! / 0.5);
  assert.equal(chargeHours(r), (r.fullUsableWh! - r.usableWh!) / 0.5);
  assert.equal(batteryState(r), "Cargando");
});
test("cambio de carga a descarga separa las áreas en el cruce por cero", () => {
  const a = { ...demo(1000, 1, "sol"), batteryV: 10, batteryA: 1 };
  const b = { ...a, time: 11000, batteryA: -1 };
  const result = integrate([a, b]);
  assert.ok(Math.abs(result.charge - 25 / 3600) < 1e-12);
  assert.ok(Math.abs(result.discharge - 25 / 3600) < 1e-12);
});
test("potencia, balance, autonomía y carga conservan unidades", () => {
  const r = demo(10000, 1, "sol");
  assert.equal(solar(r)! * 0.94 - r.loadW!, batteryPower(r));
  assert.equal(autonomy(r), r.usableWh! / r.loadW!);
  assert.equal(chargeHours(r), (256 - r.usableWh!) / batteryPower(r)!);
});
test("sin mediciones no se inventan estimaciones", () => {
  assert.equal(autonomy(), undefined);
  assert.equal(chargeHours(), undefined);
  assert.equal(solar(), undefined);
  const r = { ...demo(1, 1, "sol"), loadW: 0 };
  assert.equal(autonomy(r), undefined);
});
test("integración trapezoidal en Wh y exclusión de saltos y dispositivos", () => {
  const a = { ...demo(1, 1, "sol"), solarV: 20, solarA: 5, loadW: 50 };
  const b = { ...a, time: 10001 };
  const result = integrate([a, b]);
  assert.equal(result.generated, (100 * 10) / 3600);
  assert.equal(result.consumed, (50 * 10) / 3600);
  assert.equal(integrate([a, { ...b, time: 20001 }]).generated, 0);
  assert.equal(integrate([a, { ...b, device: "otro" }]).generated, 0);
  assert.equal(integrate([a, { ...b, source: "real" }]).generated, 0);
  assert.equal(
    integrate([
      { ...a, session: "escena-1" },
      { ...b, session: "escena-2" },
    ]).generated,
    0,
  );
});
test("protocolo rechaza no finitos, valores inválidos y tramas vacías", () => {
  for (const data of [
    { v: 1, seq: 1 },
    { v: 1, seq: 1, soc: 101 },
    { v: 1, seq: 1, loadW: Infinity },
    { v: 2, seq: 1, loadW: 2 },
    { v: 1, seq: 1, temperature: "30" },
  ])
    assert.equal(frameSchema.safeParse(data).success, false);
  assert.equal(
    frameSchema.safeParse({ v: 1, seq: 1, batteryA: -2 }).success,
    true,
  );
});
test("alertas usan límites reportados y fallas explícitas", () => {
  const r = demo(1, 1, "alerta");
  assert.ok(alerts(r).includes("Batería críticamente baja"));
  assert.ok(alerts(r).includes("Temperatura excesiva"));
  assert.ok(alerts(r).includes("Falla reportada por BMS"));
  assert.deepEqual(alerts({ ...r, limits: undefined, faults: [] }), []);
});
test("escenarios nocturno y bajo conservan procedencia simulada", () => {
  const r = demo(1, 1, "noche");
  assert.equal(solar(r), 0);
  assert.ok(batteryPower(r)! < 0);
  assert.equal(r.source, "demo");
  assert.ok(alerts(demo(1, 1, "baja")).includes("Batería baja"));
});
test("sensores ausentes no cuentan como cobertura de energía y la batería vacía no abastece cargas", () => {
  const r = {
    ...demo(1, 1, "sol"),
    solarV: undefined,
    solarA: undefined,
    loadW: undefined,
  };
  const result = integrate([r, { ...r, time: 10001 }]);
  assert.equal(result.solarSeconds, 0);
  assert.equal(result.loadSeconds, 0);
  const empty = demo(10001, 2, "noche", { ...r, usableWh: 0 });
  assert.equal(empty.loadW, 0);
  assert.equal(batteryPower(empty), 0);
});
