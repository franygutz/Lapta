import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Image,
  Pressable,
  ScrollView,
  Share,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { BreeSerif_400Regular } from "@expo-google-fonts/bree-serif/400Regular";
import { NunitoSans_400Regular } from "@expo-google-fonts/nunito-sans/400Regular";
import { Device } from "react-native-ble-plx";
import {
  alerts,
  autonomy,
  batteryPower,
  batteryState,
  chargeHours,
  demo,
  integrate,
  Reading,
  Scenario,
  solar,
  Source,
} from "./src/domain";
import {
  history,
  latest,
  preference,
  saveReading,
  seedDemo,
} from "./src/storage";
import { LaptaBLE } from "./src/ble";
import {
  BatteryRing,
  Button,
  Card,
  Chart,
  Flow,
  Icon,
  Label,
  Metric,
  palettes,
  Theme,
} from "./src/ui";
type Page =
  "Inicio" | "Energía" | "Batería" | "Salidas" | "Historial" | "Ajustes";
type ThemeMode = "light" | "dark" | "auto";
const pages: Page[] = ["Inicio", "Energía", "Historial", "Ajustes"];
const pageIcons: Record<string, string> = {
  Inicio: "home",
  Energía: "sun",
  Historial: "chart",
  Ajustes: "settings",
};
const duration = (hours?: number) =>
  hours === undefined
    ? "Sin datos suficientes"
    : hours > 999
      ? "Más de 999 h"
      : `${Math.floor(hours)} h ${Math.floor((hours % 1) * 60)} min`;
export default function App() {
  return (
    <SafeAreaProvider>
      <Lapta />
    </SafeAreaProvider>
  );
}
function Lapta() {
  const system = useColorScheme();
  const [theme, setTheme] = useState<ThemeMode>("auto");
  const dark = theme === "dark" || (theme === "auto" && system === "dark");
  const c = dark ? palettes.dark : palettes.light;
  const [fonts, fontError] = useFonts({
    BreeSerif: BreeSerif_400Regular,
    NunitoSans: NunitoSans_400Regular,
  });
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [source, setSource] = useState<Source>("demo"),
    [page, setPage] = useState<Page>("Inicio"),
    [reading, setReading] = useState<Reading>(),
    [rows, setRows] = useState<Reading[]>([]),
    [status, setStatus] = useState("Desconectado"),
    [connectedAt, setConnectedAt] = useState(0),
    [devices, setDevices] = useState<Device[]>([]),
    [scenario, setScenario] = useState<Scenario>("sol"),
    [period, setPeriod] = useState(1),
    [clock, setClock] = useState(Date.now());
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [page]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (page === "Inicio") return false;
      setPage(
        page === "Bater\u00eda" || page === "Salidas"
          ? "Energ\u00eda"
          : "Inicio",
      );
      return true;
    });
    return () => listener.remove();
  }, [page]);
  const sourceRef = useRef<Source>("demo");
  const ble = useRef<LaptaBLE | undefined>(undefined);
  const writeQueue = useRef(Promise.resolve());
  const active = useRef(true);
  const selectedDevice = useRef<string | undefined>(undefined);
  const previous = useRef<Reading | undefined>(undefined);
  const seq = useRef(0);
  const previousScenario = useRef<Scenario>("sol");
  const demoSession = useRef<string | undefined>(undefined);
  const refreshId = useRef(0);
  const lastSaved = useRef<Record<string, number>>({});
  const report = useCallback(
    (e: unknown) =>
      setError(
        e instanceof Error
          ? e.message
          : "No se pudo completar la operación. Intenta de nuevo.",
      ),
    [],
  );
  const accept = useCallback((r: Reading) => {
    if (r.source !== sourceRef.current) return;
    previous.current = r;
    setReading(r);
    const key = r.source + ":" + r.device + ":" + (r.session ?? "");
    if (r.time - (lastSaved.current[key] ?? 0) < 10000) return;
    lastSaved.current[key] = r.time;
    writeQueue.current = writeQueue.current
      .then(() => saveReading(r))
      .catch(() => {
        setError(
          "No se pudo guardar la lectura. Revisa el espacio disponible del teléfono.",
        );
      });
  }, []);
  const reload = useCallback(async () => {
    const token = ++refreshId.current;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (period - 1));
    try {
      await writeQueue.current;
      const result = await history(
        source,
        start.getTime(),
        source === "real" ? selectedDevice.current : undefined,
      );
      if (token === refreshId.current) setRows(result);
    } catch (e) {
      report(e);
    }
  }, [source, period, report]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const mode = await preference("source"),
          savedTheme = await preference("theme"),
          savedScenario = await preference("scenario");
        if (!alive) return;
        const next = mode === "real" ? "real" : "demo";
        sourceRef.current = next;
        setSource(next);
        if (["auto", "light", "dark"].includes(savedTheme ?? ""))
          setTheme(savedTheme as ThemeMode);
        if (["sol", "noche", "baja", "alerta"].includes(savedScenario ?? "")) {
          setScenario(savedScenario as Scenario);
          previousScenario.current = savedScenario as Scenario;
        }
        await seedDemo();
        const last = await latest(next);
        if (!alive) return;
        setReading(last);
        previous.current = last;
        if (next === "demo") demoSession.current = last?.session;
        selectedDevice.current = next === "real" ? last?.device : undefined;
        setReady(true);
      } catch (e) {
        report(e);
      }
    })();
    const subscription = AppState.addEventListener("change", (state) => {
      active.current = state === "active";
    });
    return () => {
      alive = false;
      subscription.remove();
      ble.current?.destroy();
    };
  }, [report]);
  useEffect(() => {
    if (!ready) return;
    void reload();
    const id = setInterval(() => {
      if (active.current) void reload();
    }, 10000);
    return () => clearInterval(id);
  }, [ready, reload]);
  useEffect(() => {
    if (!ready) return;
    if (source === "demo" && previousScenario.current !== scenario) {
      previous.current = undefined;
      demoSession.current = String(Date.now());
      previousScenario.current = scenario;
    }
    const tick = () => {
      if (!active.current) return;
      setClock(Date.now());
      if (source === "demo") {
        const nextReading = demo(
          Date.now(),
          seq.current++,
          scenario,
          previous.current?.source === "demo" ? previous.current : undefined,
        );
        accept({ ...nextReading, session: demoSession.current });
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, [ready, source, scenario, accept]);
  const changeSource = async (next: Source) => {
    if (next === source) return;
    try {
      await ble.current?.disconnect();
      sourceRef.current = next;
      refreshId.current++;
      setRows([]);
      setDevices([]);
      setSource(next);
      setReading(undefined);
      setError("");
      const last = await latest(next);
      if (sourceRef.current !== next) return;
      setReading(last);
      previous.current = last;
      if (next === "demo") demoSession.current = last?.session;
      selectedDevice.current = next === "real" ? last?.device : undefined;
      await preference("source", next);
    } catch (e) {
      report(e);
    }
  };
  const ensureBLE = () => {
    if (!ble.current)
      ble.current = new LaptaBLE(
        accept,
        (nextStatus) => {
          setStatus(nextStatus);
          if (nextStatus === "Conectado") setConnectedAt(Date.now());
        },
        setError,
      );
    return ble.current;
  };
  const scan = async () => {
    setError("");
    setDevices([]);
    try {
      await ensureBLE().disconnect();
      await ensureBLE().scan((d) =>
        setDevices((list) =>
          list.some((x) => x.id === d.id) ? list : [...list, d],
        ),
      );
    } catch (e) {
      setStatus("Desconectado");
      report(e);
    }
  };
  const connect = async (id: string) => {
    try {
      selectedDevice.current = id;
      setReading(undefined);
      setRows([]);
      await preference("device", id);
      await ensureBLE().connect(id);
      void reload();
    } catch (e) {
      report(e);
    }
  };
  const fresh =
    !!reading &&
    reading.source === source &&
    clock - reading.time <= 15000 &&
    (source === "demo" || status === "Conectado");
  const current = fresh ? reading : undefined;
  const energyRows = useMemo(() => {
    let generated = 0,
      consumed = 0;
    return rows.map((r, i) => {
      if (i) {
        const increment = integrate([rows[i - 1]!, r]);
        generated += increment.generated;
        consumed += increment.consumed;
      }
      return { ...r, generatedWh: generated, consumedWh: consumed };
    });
  }, [rows]);
  const totals = useMemo(() => integrate(rows), [rows]);
  const todayTotals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return integrate(rows.filter((r) => r.time >= today.getTime()));
  }, [rows]);
  const warnings = alerts(current);
  if (source === "real" && !fresh)
    warnings.unshift(
      status === "Conectado"
        ? !reading && clock - connectedAt <= 15000
          ? "Esperando la primera lectura de LAPTA…"
          : "Lecturas desactualizadas. Revisa el prototipo."
        : "Bluetooth desconectado. Las últimas lecturas siguen disponibles.",
    );
  const metricRows = (children: React.ReactNode) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {children}
    </View>
  );
  const metric = (label: string, value: number | undefined, unit: string) => (
    <Metric key={label} label={label} value={value} unit={unit} />
  );
  const battery = (
    <>
      <Card>
        <BatteryRing soc={current?.soc} />
        <View style={{ alignItems: "center" }}>
          <Label large>{batteryState(current)}</Label>
          <Label muted>
            {source === "demo"
              ? "Estimación del modelo de demostración"
              : "SOC entregado por el BMS/controlador"}
          </Label>
        </View>
      </Card>
      <Card>
        <Label large>Tu reserva de energía</Label>
        {metricRows([
          metric("Voltaje", current?.batteryV, "V"),
          metric("Corriente (+ carga)", current?.batteryA, "A"),
          metric("Potencia neta", batteryPower(current), "W"),
          metric("Energía utilizable", current?.usableWh, "Wh"),
          metric("Temperatura", current?.temperature, "°C"),
          metric("Salud (SOH)", current?.soh, "%"),
          metric("Ciclos", current?.cycles, ""),
        ])}
      </Card>
      <Card>
        <Label>Autonomía sin aporte solar</Label>
        <Label large>{duration(autonomy(current))}</Label>
        <Label muted>
          Energía utilizable ÷ consumo actual de las salidas. La duración real
          cambia con el uso y las pérdidas de conversión.
        </Label>
        <Label>Tiempo de carga estimado</Label>
        <Label large>{duration(chargeHours(current))}</Label>
        <Label muted>
          Supone potencia neta constante; la carga final puede tardar más.
        </Label>
      </Card>
      <Chart
        title="Carga (+) y descarga (−)"
        rows={rows}
        value={batteryPower}
        unit="W"
      />
      <Chart
        title="Carga disponible"
        rows={rows}
        value={(r) => r.soc}
        unit="%"
      />
    </>
  );
  const outputList = [
    ["USB-A · 01", "QC 3.0 · hasta 18 W", "Celulares y accesorios"],
    ["USB-A · 02", "QC 3.0 · hasta 18 W", "Celulares y accesorios"],
    ["USB-C", "PD · 20–30 W", "Capacidad final según módulo instalado"],
    [
      "Toma de 12 V",
      "Tipo encendedor · hasta 120 W",
      "Equipos compatibles de 12 V",
    ],
    [
      "Jack DC · 01",
      "Para lámpara",
      "Potencia y tensión pendientes de especificación",
    ],
    [
      "Jack DC · 02",
      "Para lámpara",
      "Potencia y tensión pendientes de especificación",
    ],
  ];
  if ((!fonts && !fontError) || !ready)
    return (
      <Theme.Provider value={c}>
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: c.bg,
            justifyContent: "center",
            padding: 32,
            gap: 20,
          }}
        >
          <Image
            source={require("./assets/imagotipo.png")}
            accessibilityLabel="LAPTA"
            resizeMode="contain"
            style={{
              width: 200,
              height: 170,
              alignSelf: "center",
              backgroundColor: "#FFF9EF",
              borderRadius: 16,
            }}
          />
          <ActivityIndicator color="#F7B92D" />
          <Label large>Preparando LAPTA</Label>
          <Label>{error || "Cargando tus datos locales…"}</Label>
          {!!error && (
            <Button
              onPress={() => {
                void seedDemo()
                  .then(() => setReady(true))
                  .catch(report);
              }}
            >
              Reintentar almacenamiento
            </Button>
          )}
        </SafeAreaView>
      </Theme.Provider>
    );
  return (
    <Theme.Provider value={c}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style={dark ? "light" : "dark"} />
        <View
          style={{
            paddingHorizontal: 22,
            paddingVertical: 10,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              width: 120,
              height: 56,
              backgroundColor: "#FFF9EF",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <Image
              source={require("./assets/logotipo.png")}
              accessibilityLabel="LAPTA"
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir ajustes de conexión"
            onPress={() => setPage("Ajustes")}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Label muted>
              {source === "demo"
                ? "● DEMOSTRACIÓN"
                : status === "Conectado"
                  ? "● Bluetooth activo"
                  : "○ Sin conexión"}
            </Label>
          </Pressable>
        </View>
        <ScrollView
          ref={scroll}
          contentContainerStyle={{
            padding: 20,
            paddingTop: 10,
            gap: 16,
            paddingBottom: 32,
          }}
        >
          {source === "demo" && (
            <View
              style={{
                padding: 12,
                borderRadius: 14,
                backgroundColor: "#F7B92D",
              }}
            >
              <Text style={{ fontFamily: "NunitoSans", color: "#0A3447" }}>
                Modo demostración · Todos los datos son simulados
              </Text>
            </View>
          )}
          {!!error && (
            <Card>
              <Label>{error}</Label>
              <Button onPress={() => setError("")}>Entendido</Button>
            </Card>
          )}
          {fontError && (
            <Label>No se pudieron cargar las fuentes locales.</Label>
          )}
          <View>
            <Label muted>
              {page === "Inicio"
                ? "ENERGÍA QUE TE ACOMPAÑA"
                : "TU ESTACIÓN LAPTA"}
            </Label>
            <Label large>
              {page === "Inicio" ? "Tu energía, a la vista." : page}
            </Label>
          </View>
          {warnings.map((w) => (
            <View
              key={w}
              accessibilityRole="alert"
              style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: dark ? "#4A3520" : "#FFF0D3",
                borderLeftWidth: 4,
                borderLeftColor: "#D28B13",
              }}
            >
              <Label>{w}</Label>
            </View>
          ))}
          {source === "real" && reading?.source === "real" && !fresh && (
            <Card>
              <Label>Última lectura guardada</Label>
              <Label muted>
                {new Date(reading.time).toLocaleString("es-NI")} ·{" "}
                {reading.device}
              </Label>
              {metricRows([
                metric("Batería", reading.soc, "%"),
                metric("Generación", solar(reading), "W"),
                metric("Consumo", reading.loadW, "W"),
              ])}
              <Label muted>Estos valores no describen el estado actual.</Label>
            </Card>
          )}
          {page === "Inicio" && (
            <>
              <Card>
                <BatteryRing soc={current?.soc} />
                <View style={{ alignItems: "center", gap: 4 }}>
                  <Label>{batteryState(current)}</Label>
                  <Label large>{duration(autonomy(current))}</Label>
                  <Label muted>de autonomía estimada sin aporte solar</Label>
                </View>
                <Button onPress={() => setPage("Batería")}>
                  Ver mi batería
                </Button>
              </Card>
              <Card
                style={{ backgroundColor: "#F7B92D", borderColor: "#F7B92D" }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Icon name="sun" color="#0A3447" />
                  <Text style={{ color: "#0A3447", fontFamily: "NunitoSans" }}>
                    DEL SOL A TU HOGAR
                  </Text>
                </View>
                <Text
                  style={{
                    fontFamily: "BreeSerif",
                    fontSize: 44,
                    color: "#0A3447",
                  }}
                >
                  {solar(current)?.toFixed(1) ?? "—"}{" "}
                  <Text style={{ fontSize: 22 }}>W</Text>
                </Text>
                <Text style={{ fontFamily: "NunitoSans", color: "#0A3447" }}>
                  {current?.faults.includes("solar")
                    ? "El hardware reporta una falla"
                    : solar(current) === undefined
                      ? "Conecta LAPTA para conocer la generación"
                      : (solar(current) ?? 0) > 5
                        ? "Tu panel está produciendo energía"
                        : "Generación baja: puede faltar luz solar"}
                </Text>
                <Button onPress={() => setPage("Energía")}>
                  Explorar generación
                </Button>
              </Card>
              <Card>
                {metricRows([
                  metric("Consumo actual", current?.loadW, "W"),
                  metric(
                    "Solar registrada hoy",
                    todayTotals.solarSeconds
                      ? todayTotals.generated
                      : undefined,
                    "Wh",
                  ),
                ])}
                <Label muted>
                  {current
                    ? `Última lectura: ${new Date(current.time).toLocaleTimeString("es-NI")}`
                    : "Esperando una lectura reciente"}
                </Label>
              </Card>
              <Flow
                solarW={solar(current)}
                batteryW={batteryPower(current)}
                loadW={current?.loadW}
                fresh={fresh}
              />
            </>
          )}
          {page === "Energía" && (
            <>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Button selected onPress={() => setPage("Energía")}>
                  Panel solar
                </Button>
                <Button onPress={() => setPage("Batería")}>Batería</Button>
                <Button onPress={() => setPage("Salidas")}>6 salidas</Button>
              </View>
              <Card>
                <Label large>La energía empieza aquí</Label>
                {metricRows([
                  metric("Potencia solar", solar(current), "W"),
                  metric("Voltaje del panel", current?.solarV, "V"),
                  metric("Corriente del panel", current?.solarA, "A"),
                  metric(
                    "Total diario del equipo",
                    current?.solarTodayWh,
                    "Wh",
                  ),
                  metric(
                    "Registrado hoy",
                    todayTotals.solarSeconds
                      ? todayTotals.generated
                      : undefined,
                    "Wh",
                  ),
                  metric(
                    "Máximo registrado hoy",
                    rows.some((r) => solar(r) !== undefined)
                      ? rows.reduce(
                          (maximum, r) => Math.max(maximum, solar(r) ?? 0),
                          0,
                        )
                      : undefined,
                    "W",
                  ),
                ])}
                <Label muted>
                  Una generación baja no confirma una falla. Solo se muestra una
                  falla cuando el controlador la reporta.
                </Label>
              </Card>
              <Chart
                title="Producción solar registrada"
                rows={rows}
                value={solar}
                unit="W"
              />
              <Flow
                solarW={solar(current)}
                batteryW={batteryPower(current)}
                loadW={current?.loadW}
                fresh={fresh}
              />
            </>
          )}
          {(page === "Batería" || page === "Salidas") && (
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Button onPress={() => setPage("Energía")}>Panel solar</Button>
              <Button
                selected={page === "Batería"}
                onPress={() => setPage("Batería")}
              >
                Batería
              </Button>
              <Button
                selected={page === "Salidas"}
                onPress={() => setPage("Salidas")}
              >
                6 salidas
              </Button>
            </View>
          )}
          {page === "Batería" && battery}
          {page === "Salidas" && (
            <>
              <Card>
                <Label large>Seis formas de aprovecharla</Label>
                <Metric
                  label="Consumo total medido"
                  value={current?.loadW}
                  unit="W"
                />
                <Label muted>
                  Las capacidades son nominales. No hay medición individual ni
                  control remoto de las salidas.
                </Label>
              </Card>
              {outputList.map(([name, power, description]) => (
                <Card key={name}>
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    <Icon name="plug" color={c.green} />
                    <View style={{ flex: 1 }}>
                      <Label large>{name}</Label>
                      <Label>{power}</Label>
                      <Label muted>{description}</Label>
                    </View>
                  </View>
                </Card>
              ))}
              <Label muted>
                Las potencias nominales por conector no garantizan que puedan
                usarse todas simultáneamente. Respeta el límite total del
                controlador.
              </Label>
            </>
          )}
          {page === "Historial" && (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {[
                  [1, "Hoy"],
                  [7, "7 días"],
                  [30, "30 días"],
                ].map(([n, label]) => (
                  <Button
                    key={n}
                    selected={period === n}
                    onPress={() => setPeriod(Number(n))}
                  >
                    {label}
                  </Button>
                ))}
              </View>
              <Label muted>
                {source === "demo" ? "Historial simulado" : "Historial real"} ·{" "}
                {rows.length} lecturas · {Math.round(totals.seconds / 60)} min
                cubiertos
              </Label>
              <Card>
                {metricRows([
                  metric(
                    "Solar registrada",
                    totals.solarSeconds ? totals.generated : undefined,
                    "Wh",
                  ),
                  metric(
                    "Consumo registrado",
                    totals.loadSeconds ? totals.consumed : undefined,
                    "Wh",
                  ),
                  metric(
                    "Carga de batería",
                    totals.batterySeconds ? totals.charge : undefined,
                    "Wh",
                  ),
                  metric(
                    "Descarga de batería",
                    totals.batterySeconds ? totals.discharge : undefined,
                    "Wh",
                  ),
                ])}
                <Label muted>
                  Se integran lecturas separadas por hasta 15 segundos. Los
                  períodos sin lecturas no se estiman.
                </Label>
              </Card>
              <Chart
                title="Generación solar"
                rows={rows}
                value={solar}
                unit="W"
              />
              <Chart
                title="Consumo de la estación"
                rows={rows}
                value={(r) => r.loadW}
                unit="W"
              />
              <Chart
                title="Carga y descarga"
                rows={rows}
                value={batteryPower}
                unit="W"
              />
              <Chart
                title="Evolución de batería"
                rows={rows}
                value={(r) => r.soc}
                unit="%"
              />
              <Chart
                title="Solar acumulada registrada"
                rows={energyRows}
                value={(r) =>
                  solar(r) === undefined
                    ? undefined
                    : (r as Reading & { generatedWh: number }).generatedWh
                }
                unit="Wh"
              />
              <Chart
                title="Consumo acumulado registrado"
                rows={energyRows}
                value={(r) =>
                  r.loadW === undefined
                    ? undefined
                    : (r as Reading & { consumedWh: number }).consumedWh
                }
                unit="Wh"
              />
              <Button
                disabled={!rows.length}
                onPress={() => {
                  const csv =
                    "origen,dispositivo,fecha,solar_W,consumo_W,bateria_W,soc\n" +
                    rows
                      .slice(-2000)
                      .map((r) =>
                        [
                          r.source,
                          r.device,
                          new Date(r.time).toISOString(),
                          solar(r) ?? "",
                          r.loadW ?? "",
                          batteryPower(r) ?? "",
                          r.soc ?? "",
                        ].join(","),
                      )
                      .join("\n");
                  void Share.share({
                    message: csv,
                    title: "Historial LAPTA",
                  }).catch(report);
                }}
              >
                Compartir hasta 2.000 registros CSV
              </Button>
            </>
          )}
          {page === "Ajustes" && (
            <>
              <Card>
                <Label large>Cómo quieres usar LAPTA</Label>
                <Button
                  selected={source === "real"}
                  onPress={() => {
                    void changeSource("real");
                  }}
                >
                  Dispositivo real
                </Button>
                <Button
                  selected={source === "demo"}
                  onPress={() => {
                    void changeSource("demo");
                  }}
                >
                  Modo demostración
                </Button>
                <Label muted>
                  Ambas modalidades guardan su historial por separado en este
                  teléfono.
                </Label>
              </Card>
              {source === "demo" ? (
                <Card>
                  <Label>Escenario de demostración</Label>
                  {(
                    [
                      ["sol", "Sol y carga"],
                      ["noche", "Sin sol y descarga"],
                      ["baja", "Batería baja"],
                      ["alerta", "Condición de alerta"],
                    ] as const
                  ).map(([key, label]) => (
                    <Button
                      key={key}
                      selected={scenario === key}
                      onPress={() => {
                        setScenario(key);
                        void preference("scenario", key).catch(report);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                  <Label muted>
                    Batería ficticia de 256 Wh. Umbrales de demostración: 20 % /
                    8 %, 50 °C y 15 A; no configuran el equipo real.
                  </Label>
                </Card>
              ) : (
                <Card>
                  <Label large>Conecta tu estación</Label>
                  <Label>{status}</Label>
                  <Button
                    onPress={() => {
                      void scan();
                    }}
                  >
                    Buscar LAPTA por Bluetooth
                  </Button>
                  {devices.map((d) => (
                    <Button
                      key={d.id}
                      onPress={() => {
                        void connect(d.id);
                      }}
                    >
                      {d.name ?? "LAPTA"} · {d.id}
                    </Button>
                  ))}
                  {!devices.length && (
                    <Label muted>
                      Enciende LAPTA y mantenla cerca. La búsqueda dura 12
                      segundos.
                    </Label>
                  )}
                  <Button
                    onPress={() => {
                      void preference("device")
                        .then((id) => {
                          if (id) void connect(id);
                          else
                            setError(
                              "Todavía no hay una estación recordada. Busca LAPTA primero.",
                            );
                        })
                        .catch(report);
                    }}
                  >
                    Reconectar estación recordada
                  </Button>
                  <Button
                    onPress={() => {
                      void ble.current?.disconnect();
                    }}
                  >
                    Desconectar
                  </Button>
                  <Label muted>
                    Las interrupciones involuntarias activan la reconexión.
                    Después de cerrar la app, usa Reconectar. El monitoreo se
                    realiza con la app abierta.
                  </Label>
                </Card>
              )}
              <Card>
                <Label large>Apariencia</Label>
                {(
                  [
                    ["auto", "Automático"],
                    ["light", "Claro"],
                    ["dark", "Oscuro"],
                  ] as const
                ).map(([mode, label]) => (
                  <Button
                    key={mode}
                    selected={theme === mode}
                    onPress={() => {
                      setTheme(mode);
                      void preference("theme", mode).catch(report);
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </Card>
              <Card>
                <Label large>Hecha para funcionar cerca de ti</Label>
                <Label>Bluetooth directo · SQLite local · Sin cuentas</Label>
                <Label muted>
                  La app funciona sin Wi-Fi ni datos móviles. Las protecciones
                  eléctricas corresponden al BMS y al controlador.
                </Label>
                <Label muted>
                  Los umbrales reales deben venir del firmware, según la batería
                  y los componentes instalados. Sin especificaciones verificadas
                  no se aplican umbrales genéricos.
                </Label>
              </Card>
            </>
          )}
        </ScrollView>
        <View
          style={{
            flexDirection: "row",
            backgroundColor: c.card,
            borderTopWidth: 1,
            borderColor: c.line,
            paddingTop: 6,
            paddingBottom: 4,
          }}
        >
          {pages.map((p) => {
            const selected =
              p === page ||
              (p === "Energía" && (page === "Batería" || page === "Salidas"));
            return (
              <Pressable
                key={p}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => {
                  setPage(p);
                  if (p !== "Historial") setPeriod(1);
                }}
                style={{
                  flex: 1,
                  minHeight: 60,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                <Icon
                  name={pageIcons[p]!}
                  color={selected ? c.green : c.muted}
                />
                <Text
                  style={{
                    fontFamily: "NunitoSans",
                    fontSize: 12,
                    color: selected ? c.green : c.muted,
                    fontWeight: selected ? "700" : "400",
                  }}
                >
                  {p}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </Theme.Provider>
  );
}
