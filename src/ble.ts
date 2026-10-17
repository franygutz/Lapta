import { BleManager, Device, Subscription, State } from "react-native-ble-plx";
import { PermissionsAndroid, Platform } from "react-native";
import { Buffer } from "buffer";
import { Reading } from "./domain";
import { TelemetryDecoder } from "./protocol";
export const SERVICE = "5cba1000-7c21-4f89-a428-4c4150544100";
export const TELEMETRY = "5cba1001-7c21-4f89-a428-4c4150544100";
export class LaptaBLE {
  private manager = new BleManager();
  private notify?: Subscription;
  private disconnectSub?: Subscription;
  private retry?: ReturnType<typeof setTimeout>;
  private scanTimer?: ReturnType<typeof setTimeout>;
  private stopped = true;
  private attempt = 0;
  private generation = 0;
  private id?: string;
  private lastSeq = -1;
  constructor(
    private onReading: (r: Reading) => void,
    private onStatus: (s: string) => void,
    private onError: (s: string) => void,
  ) {}
  async scan(onDevice: (d: Device) => void) {
    this.manager.stopDeviceScan();
    if (this.scanTimer) clearTimeout(this.scanTimer);
    if (Platform.OS === "android") {
      const permissions =
        Number(Platform.Version) >= 31
          ? [
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
              PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            ]
          : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
      const result = await PermissionsAndroid.requestMultiple(permissions);
      if (
        Object.values(result).some(
          (v) => v !== PermissionsAndroid.RESULTS.GRANTED,
        )
      )
        throw Error(
          "Permite el acceso a Bluetooth en Ajustes de Android para buscar LAPTA.",
        );
    }
    if ((await this.manager.state()) !== State.PoweredOn)
      throw Error("Activa Bluetooth en el teléfono y vuelve a buscar.");
    this.onStatus("Buscando LAPTA…");
    this.manager.startDeviceScan([SERVICE], null, (error, device) => {
      if (error) {
        this.onError("No se pudo buscar. Revisa Bluetooth y los permisos.");
        this.manager.stopDeviceScan();
        this.onStatus("Desconectado");
        return;
      }
      if (device) onDevice(device);
    });
    this.scanTimer = setTimeout(() => {
      this.manager.stopDeviceScan();
      this.onStatus("Búsqueda finalizada");
    }, 12000);
  }
  async connect(id: string, reconnecting = false) {
    if (!reconnecting) {
      const request = this.generation + 1;
      await this.disconnect();
      if (this.generation !== request) return;
      this.stopped = false;
      this.id = id;
      this.attempt = 0;
    }
    if (this.stopped) return;
    const generation = this.generation;
    this.manager.stopDeviceScan();
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.onStatus(reconnecting ? "Reconectando…" : "Conectando…");
    try {
      const device = await this.manager.connectToDevice(id, {
        timeout: 12000,
        requestMTU: 247,
      });
      if (this.stopped || generation !== this.generation) {
        await device.cancelConnection();
        return;
      }
      await device.discoverAllServicesAndCharacteristics();
      if (this.stopped || generation !== this.generation) {
        await device.cancelConnection();
        return;
      }
      this.lastSeq = -1;
      this.notify?.remove();
      this.disconnectSub?.remove();
      this.attempt = 0;
      const decoder = new TelemetryDecoder();
      this.disconnectSub = this.manager.onDeviceDisconnected(id, () => {
        this.notify?.remove();
        this.onStatus("Conexión interrumpida");
        this.schedule();
      });
      this.notify = device.monitorCharacteristicForService(
        SERVICE,
        TELEMETRY,
        (error, characteristic) => {
          if (this.stopped || generation !== this.generation) return;
          if (error) {
            this.onError("Se interrumpió la recepción de lecturas.");
            this.onStatus("Conexión interrumpida");
            void this.manager
              .cancelDeviceConnection(id)
              .catch(() => this.schedule());
            return;
          }
          if (!characteristic?.value) return;
          try {
            for (const frame of decoder.push(
              Buffer.from(characteristic.value, "base64").toString("utf8"),
            )) {
              if (frame.seq <= this.lastSeq) continue;
              this.lastSeq = frame.seq;
              this.onReading({
                ...frame,
                time: Date.now(),
                source: "real",
                device: id,
              });
            }
          } catch {
            this.onError(
              "LAPTA envió una lectura inválida. Revisa el protocolo del firmware.",
            );
          }
        },
      );
      this.onStatus("Conectado");
    } catch {
      if (this.stopped || generation !== this.generation) return;
      await this.manager.cancelDeviceConnection(id).catch(() => {});
      this.onStatus("Sin conexión");
      this.onError(
        "No se pudo conectar. Acerca LAPTA y comprueba que esté encendida.",
      );
      this.schedule();
    }
  }
  private schedule() {
    if (this.stopped || !this.id) return;
    if (this.retry) clearTimeout(this.retry);
    this.retry = setTimeout(
      () => {
        if (this.id) void this.connect(this.id, true);
      },
      Math.min(30000, 1000 * 2 ** this.attempt++),
    );
  }
  async disconnect() {
    this.stopped = true;
    this.generation++;
    if (this.retry) clearTimeout(this.retry);
    if (this.scanTimer) clearTimeout(this.scanTimer);
    this.manager.stopDeviceScan();
    this.notify?.remove();
    this.disconnectSub?.remove();
    if (this.id)
      await this.manager.cancelDeviceConnection(this.id).catch(() => {});
    this.id = undefined;
    this.onStatus("Desconectado");
  }
  destroy() {
    void this.disconnect().finally(() => this.manager.destroy());
  }
}
