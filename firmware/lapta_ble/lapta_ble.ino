// ESP32 Arduino. Transporte real; NO genera mediciones ficticias.
// Completar readSensors con controladores calibrados y especificaciones del pack.
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
static BLECharacteristic *telemetry;
static bool connected = false;
static uint32_t sequence = 0;
class Callbacks : public BLEServerCallbacks {
 void onConnect(BLEServer*) override { connected = true; sequence = 0; }
 void onDisconnect(BLEServer*) override { connected = false; BLEDevice::startAdvertising(); }
};
// Retornar campos JSON sin llaves únicamente cuando haya medidas reales.
// Ejemplo estructural: fields = "\"batteryV\":" + String(voltage, 3);
bool readSensors(String &fields) { return false; }
void setup() {
 Serial.begin(115200);
 char prototypeCode[19];
 snprintf(prototypeCode, sizeof(prototypeCode), "LAPTA-%012llX", (unsigned long long)(ESP.getEfuseMac() & 0xFFFFFFFFFFFFULL));
 Serial.print("Codigo para la etiqueta y la app: "); Serial.println(prototypeCode);
 BLEDevice::init(prototypeCode); BLEDevice::setMTU(247);
 auto server=BLEDevice::createServer(); server->setCallbacks(new Callbacks());
 auto service=server->createService("5cba1000-7c21-4f89-a428-4c4150544100");
 telemetry=service->createCharacteristic("5cba1001-7c21-4f89-a428-4c4150544100",BLECharacteristic::PROPERTY_NOTIFY);
 telemetry->addDescriptor(new BLE2902()); service->start();
 auto advertising=BLEDevice::getAdvertising(); advertising->addServiceUUID(service->getUUID()); advertising->setScanResponse(true); advertising->start();
 Serial.println("BLE listo. Sensores pendientes: no se enviaran valores inventados.");
}
void loop() {
 if(connected){String fields;if(readSensors(fields)&&fields.length()){
  String frame="{\"v\":1,\"seq\":"+String(sequence++)+","+fields+"}\n";
  for(size_t offset=0;offset<frame.length()&&connected;offset+=20){String chunk=frame.substring(offset,offset+20);telemetry->setValue(chunk.c_str());telemetry->notify();delay(20);}
 }}delay(2000);
}
