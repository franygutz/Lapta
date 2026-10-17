import { z } from "zod";
const positive = z.number().finite().min(0);
export const frameSchema = z
  .object({
    v: z.literal(1),
    seq: z.number().int().nonnegative(),
    solarV: positive.max(100).optional(),
    solarA: positive.max(100).optional(),
    batteryV: positive.max(100).optional(),
    batteryA: z.number().finite().min(-200).max(200).optional(),
    loadW: positive.max(10000).optional(),
    soc: positive.max(100).optional(),
    usableWh: positive.max(100000).optional(),
    fullUsableWh: positive.positive().max(100000).optional(),
    temperature: z.number().finite().min(-50).max(150).optional(),
    soh: positive.max(100).optional(),
    cycles: z.number().int().nonnegative().optional(),
    solarTodayWh: positive.optional(),
    faults: z
      .array(
        z.enum([
          "solar",
          "bms",
          "controller",
          "overcurrent",
          "temperature",
          "low",
          "critical",
        ]),
      )
      .max(10)
      .default([]),
    limits: z
      .object({
        lowSoc: positive.max(100).optional(),
        criticalSoc: positive.max(100).optional(),
        maxTemperature: z.number().finite().optional(),
        maxBatteryA: positive.positive().optional(),
      })
      .refine(
        (l) =>
          l.lowSoc === undefined ||
          l.criticalSoc === undefined ||
          l.criticalSoc <= l.lowSoc,
        "Umbrales SOC incoherentes",
      )
      .optional(),
  })
  .refine(
    (f) =>
      f.faults.length > 0 ||
      Object.keys(f).some((k) => !["v", "seq", "faults", "limits"].includes(k)),
    "Sin mediciones",
  )
  .refine(
    (f) =>
      f.usableWh === undefined ||
      f.fullUsableWh === undefined ||
      f.usableWh <= f.fullUsableWh,
    "Energía restante mayor que capacidad útil",
  );
export type Frame = z.infer<typeof frameSchema>;
export type Source = "demo" | "real";
export type Reading = Frame & {
  time: number;
  source: Source;
  device: string;
  session?: string;
  demoRate?: number;
};
export function solar(r?: Reading) {
  return r?.solarV !== undefined && r.solarA !== undefined
    ? r.solarV * r.solarA
    : undefined;
}
export function batteryPower(r?: Reading) {
  return r?.batteryV !== undefined && r.batteryA !== undefined
    ? r.batteryV * r.batteryA
    : undefined;
}
export function autonomy(r?: Reading) {
  return r?.usableWh !== undefined && r.loadW !== undefined && r.loadW > 0
    ? r.usableWh / r.loadW
    : undefined;
}
export function chargeHours(r?: Reading) {
  const p = batteryPower(r);
  return p !== undefined &&
    p > 0 &&
    r?.usableWh !== undefined &&
    r.fullUsableWh !== undefined &&
    r.fullUsableWh >= r.usableWh
    ? (r.fullUsableWh - r.usableWh) / p
    : undefined;
}
export function batteryState(r?: Reading) {
  const p = batteryPower(r);
  return p === undefined
    ? "Sin medición"
    : p > 0
      ? "Cargando"
      : p < 0
        ? "Descargando"
        : "En reposo";
}
export function alerts(r?: Reading): string[] {
  if (!r) return [];
  const a: string[] = [];
  const l = r.limits;
  if (
    r.soc !== undefined &&
    l?.criticalSoc !== undefined &&
    r.soc <= l.criticalSoc
  )
    a.push("Batería críticamente baja");
  else if (r.soc !== undefined && l?.lowSoc !== undefined && r.soc <= l.lowSoc)
    a.push("Batería baja");
  if (
    r.temperature !== undefined &&
    l?.maxTemperature !== undefined &&
    r.temperature >= l.maxTemperature
  )
    a.push("Temperatura excesiva");
  if (
    r.batteryA !== undefined &&
    l?.maxBatteryA !== undefined &&
    Math.abs(r.batteryA) > l.maxBatteryA
  )
    a.push("Sobrecorriente en batería");
  const labels: Record<string, string> = {
    solar: "Falla solar reportada",
    bms: "Falla reportada por BMS",
    controller: "Falla del controlador",
    overcurrent: "Sobrecorriente reportada",
    temperature: "Alarma térmica reportada",
    low: "Batería baja reportada",
    critical: "Batería crítica reportada",
  };
  return [...new Set([...a, ...r.faults.map((f) => labels[f]!)])];
}
export function integrate(rows: Reading[]) {
  let generated = 0,
    consumed = 0,
    charge = 0,
    discharge = 0,
    seconds = 0,
    solarSeconds = 0,
    loadSeconds = 0,
    batterySeconds = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1]!,
      b = rows[i]!;
    const elapsed = (b.time - a.time) / 3600000;
    if (
      elapsed <= 0 ||
      elapsed > 15 / 3600 ||
      a.device !== b.device ||
      a.source !== b.source ||
      a.session !== b.session ||
      (a.source === "demo" && (a.demoRate ?? 1) !== (b.demoRate ?? 1))
    )
      continue;
    const rate = a.source === "demo" ? (a.demoRate ?? 1) : 1;
    if (!Number.isFinite(rate) || rate < 1 || rate > 360) continue;
    const dt = elapsed * rate;
    const sa = solar(a),
      sb = solar(b);
    if (sa !== undefined && sb !== undefined) {
      generated += ((sa + sb) / 2) * dt;
      solarSeconds += dt * 3600;
    }
    if (a.loadW !== undefined && b.loadW !== undefined) {
      consumed += ((a.loadW + b.loadW) / 2) * dt;
      loadSeconds += dt * 3600;
    }
    const pa = batteryPower(a),
      pb = batteryPower(b);
    if (pa !== undefined && pb !== undefined) {
      if (pa * pb < 0) {
        // Separar en el cruce por cero para no duplicar energía al cambiar de sentido.
        const crossing = Math.abs(pa) / (Math.abs(pa) + Math.abs(pb));
        charge += ((pa > 0 ? pa * crossing : pb * (1 - crossing)) / 2) * dt;
        discharge +=
          ((pa < 0 ? -pa * crossing : -pb * (1 - crossing)) / 2) * dt;
      } else {
        charge += Math.max((pa + pb) / 2, 0) * dt;
        discharge += Math.max(-(pa + pb) / 2, 0) * dt;
      }
      batterySeconds += dt * 3600;
    }
    seconds += dt * 3600;
  }
  return {
    generated,
    consumed,
    charge,
    discharge,
    seconds,
    solarSeconds,
    loadSeconds,
    batterySeconds,
  };
}
export type Scenario = "sol" | "noche" | "baja" | "alerta";
export function demo(
  time: number,
  seq: number,
  scenario: Scenario,
  previous?: Reading,
  rate = 1,
): Reading {
  rate = Number.isFinite(rate) ? Math.min(360, Math.max(1, rate)) : 1;
  let sun =
    scenario !== "sol" ? 0 : Math.max(0, 86 + 18 * Math.sin(time / 45000));
  let load = scenario === "noche" ? 48 : 32 + 6 * Math.sin(time / 23000);
  let stored = previous?.usableWh ?? 184;
  if (scenario === "baja" && stored > 51) stored = 25;
  if (scenario === "alerta" && stored > 20) stored = 12;
  let net = sun * 0.94 - load;
  if (stored >= 256 && net > 0) {
    net = 0;
    sun = load / 0.94;
  }
  if (stored <= 0 && net < 0) {
    net = 0;
    load = sun * 0.94;
  }
  const dt = previous
    ? Math.max(0, Math.min(15, (time - previous.time) / 1000)) * rate
    : 0;
  const wh = Math.min(256, Math.max(0, stored + (net * dt) / 3600));
  return {
    v: 1,
    seq,
    time,
    source: "demo",
    demoRate: rate,
    device: "LAPTA-DEMO",
    solarV: scenario === "noche" ? 0 : 19.6,
    solarA: scenario === "noche" ? 0 : sun / 19.6,
    batteryV: 12.8,
    batteryA: net / 12.8,
    loadW: load,
    soc: (wh / 256) * 100,
    usableWh: wh,
    fullUsableWh: 256,
    temperature: scenario === "alerta" ? 58 : 30.2,
    soh: 96,
    cycles: 42,
    faults: scenario === "alerta" ? ["bms"] : [],
    limits: { lowSoc: 20, criticalSoc: 8, maxTemperature: 50, maxBatteryA: 15 },
  };
}
