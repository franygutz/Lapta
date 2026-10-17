# Integración LAPTA · contrato v1

La aplicación se comunica directamente por BLE, sin Wi-Fi, servidor, cuenta ni suscripción. No se ha recibido el esquema, la química/capacidad de batería, modelo de controlador, sensores instalados ni firmware del prototipo. Esta propuesta **no confirma su instalación o compatibilidad eléctrica**.

## Arquitectura propuesta

Panel → monitor V/I → controlador de carga → batería con BMS → convertidores y seis salidas.
Tres canales de medición independientes: entrada solar, batería bidireccional, consumo total en el bus de salida. I²C a 3,3 V → ESP32 → GATT BLE → app → SQLite. La batería puede recibir y entregar energía al sistema mientras el solar abastece parte del consumo; el canal de batería muestra el balance neto, no ambos sentidos simultáneos internos.

## Opciones investigadas

Fuentes primarias consultadas el 17-10-2026. Las precisiones del circuito integrado no incluyen errores del shunt, PCB ni calibración.

|Monitor TI|Rango de bus|Resolución|Interfaz / alimentación|Limitación y selección|
|---|---|---|---|---|
|[INA219](https://www.ti.com/product/INA219)|0–26 V|12 bits|I²C / 3–5,5 V|Solo si Voc del panel en frío y transitorios quedan dentro del rango. Menor margen|
|[INA226](https://www.ti.com/product/INA226)|0–36 V|16 bits|I²C / 2,7–5,5 V|Alternativa económica si tensión máxima verificada <36 V|
|[INA228](https://www.ti.com/product/INA228)|0–85 V|20 bits|I²C / 2,7–5,5 V|Propuesta preferida por margen y acumulación de carga/energía. Error de ganancia máx. 0,05 %, offset máx. 1 µV; consumo típico 640 µA|

No usar la temperatura interna de estos IC como temperatura de batería. Hace falta una sonda en las celdas o dato del BMS con ubicación conocida. SOH y ciclos requieren información del BMS; SOC requiere contador de carga calibrado, capacidad y química conocidas. No se estima SOC únicamente con el voltaje.

|Controladora|Decisión|
|---|---|
|[ESP32-C3](https://documentation.espressif.com/esp32-c3_datasheet_en.html)|Preferida para telemetría BLE sencilla, I²C y bajo costo; lógica de 3,3 V|
|[ESP32-S3](https://documentation.espressif.com/esp32_s3_datasheet_en.pdf)|Alternativa si se necesita más procesamiento o periféricos|

BLE es la conectividad elegida: Android directo y sin infraestructura. Wi-Fi local requeriría AP/configuración y más consumo; no se implementa porque el requisito pide BLE. No se usa Bluetooth clásico SPP, ausente en C3/S3. La comparación ponderada favorece compatibilidad BLE (40 %), margen eléctrico (30 %), complejidad (20 %) y costo verificable (10 %); el costo no se puntuó por falta de cotizaciones. La selección definitiva depende del esquema y rangos.

## Conexiones y BOM pendiente de verificación

- 1 ESP32-C3 de desarrollo o la placa ESP32 ya existente, regulador estable y desacoplo. Confirmar GPIO libres en la placa; no asignar pines de arranque sin revisar su ficha.
- 3 INA228 (o INA226 si corresponde) con direcciones I²C distintas y shunts Kelvin dimensionados: panel, batería y consumo total. SDA/SCL con pull-ups a 3,3 V y masa común solo en arquitectura no aislada apropiada. No conectar el panel directamente al ADC.
- 3 shunts de precisión con margen térmico. Ejemplo de cálculo, **no especificación del equipo**: 15 A × 2 mΩ = 30 mV, disipación 0,45 W; seleccionar potencia con margen y calibrar. Verificar también límite del módulo y pistas.
- Sonda de batería/BMS con temperatura documentada. El sensor interno del ESP32 tampoco mide la batería.
- Fusibles, cableado y conectores según corrientes máximas verificadas. Medición individual requeriría seis canales adicionales; la app actual no los presume.

Cada línea requiere SKU de módulo, cantidad, proveedor, precio, moneda, stock, transporte, impuestos, calibración y fecha de cotización antes de compra. No hay precios inventados. CAPEX pendiente de cotizar; conectividad/cloud a 12/36 meses: 0 por arquitectura. Reposición y mantenimiento dependen del hardware.

Presupuesto energético: medir I activo, I reposo y duty-cycle del módulo completo, no solo del chip. P = V × I; E_día = P_activo × h_activo + P_reposo × h_reposo, incorporando rendimiento de regulador y margen. Sin esos datos no se promete autonomía del ESP32.

## Servicio GATT

- Nombre anunciado: `LAPTA` y servicio `5cba1000-7c21-4f89-a428-4c4150544100`.
- Característica NOTIFY: `5cba1001-7c21-4f89-a428-4c4150544100`.
- Transporte: JSON ASCII terminado en `\n` (NDJSON). Fragmentar en bloques de hasta MTU−3 bytes; la app solicita MTU 247, pero admite bloques de 20 bytes. Máximo 8192 caracteres de buffer. Tiempo máximo entre fragmentos: 5 s. Frecuencia objetivo: una trama cada 2 s.
- Versión `v:1`; `seq` entero creciente por conexión. Reiniciar secuencia solo al reconectar. El teléfono asigna fecha de recepción; no atribuye al firmware una hora sin RTC.
- Todos los campos de medición son opcionales. Omitir lo no medido, **no enviar cero como sustituto**. Se exige al menos una medición o una falla explícita; una alarma puede recibirse aunque un sensor no funcione. Tramas inválidas no se guardan.

```json
{"v":1,"seq":25,"solarV":19.6,"solarA":4.2,"batteryV":12.8,"batteryA":2.1,"loadW":49.8,"soc":72,"usableWh":184,"fullUsableWh":256,"temperature":30,"faults":[]}
```

Este ejemplo documenta el formato; no representa una lectura del prototipo. `batteryA` positivo = carga, negativo = descarga. V, A, W, Wh, °C, SOC/SOH en %, ciclos entero. `usableWh`, `fullUsableWh` y `loadW` deben usar la misma frontera energética. Con el sensor total en el bus que alimenta los convertidores, `loadW` incluye sus pérdidas y los Wh utilizables se refieren a ese bus después de la reserva; no descontar otra vez las pérdidas que ya están en el consumo. Si se mide potencia final entregada a dispositivos, el firmware debe estimar Wh entregables después de conversión. Documentar la calibración y frontera elegidas. `solarTodayWh` opcional debe ser contador diario real del controlador y reiniciarse según día local. `soh` y `cycles` son opcionales.

`faults`: `solar`, `bms`, `controller`, `overcurrent`, `temperature`, `low`, `critical`. Reportar únicamente fallas confirmadas por hardware. Generación baja sola no significa panel averiado.

`limits` opcional: `lowSoc`, `criticalSoc`, `maxTemperature`, `maxBatteryA`. Deben salir de la ficha del pack/BMS/controlador validado. Sin límites no hay avisos por comparación genérica, aunque sí se muestran fallas explícitas. La app no sustituye las protecciones físicas.

Los límites de parser (100 V, ±200 A, 10 kW) son defensas contra datos malformados, **no rangos eléctricos permitidos del prototipo**. Ajustar junto con el hardware.

## Cálculos y límites operativos

Potencia solar = V_panel × I_panel; potencia neta de batería = V_batería × I_batería. Autonomía sin sol = Wh utilizables / W de consumo. Tiempo de carga = (Wh útiles completos − Wh útiles actuales) / W netos de carga; aproximación a potencia constante, no predicción del final de carga.

La energía registrada se integra por trapecios en Wh. No integrar huecos >15 s, tiempos negativos, cambios de dispositivo ni cambios real/demo. No se recuperan lecturas durante desconexiones. La pantalla muestra fecha de datos guardados y no los presenta como actuales. El modo demo usa base separada por columna `source` y equipo `LAPTA-DEMO`.

La app reconecta con espera exponencial 1–30 s; desconectar manualmente cancela reintentos. Al reiniciar, el usuario puede reconectar la estación recordada. Monitoreo solo con app abierta: no hay servicio Android en segundo plano. Identificar por UUID no autentica la estación; antes de distribución a terceros definir bonding y autenticación con el firmware.

La demostración conserva su escenario entre reinicios. Cambiar de escenario abre una sesión simulada nueva con su batería inicial; no se integra energía ni se une la curva entre sesiones. El historial anterior permanece identificado como simulado. Esta separación no altera el protocolo del ESP32 ni los datos reales.

## Pruebas de banco pendientes

1. Verificar esquema, Voc en frío, corrientes y química; completar límites y capacidades.
2. Calibrar tres canales contra instrumentos en cero, media carga y carga máxima; comprobar signo de batería.
3. Verificar balance solar, batería y consumo con pérdidas y energía acumulada de referencia.
4. Ensayar desconexión, apagado, alcance, fragmentación de 20 bytes, JSON inválido, reinicio y reconexión sin duplicados.
5. Contrastar temperatura con sonda y fallas de BMS usando procedimientos del fabricante.
6. Teléfono en modo avión con Bluetooth activado: demo, conexión, historial y reapertura offline.
