# Integración LAPTA · ACS y contrato BLE v1

La aplicación se comunica directamente por BLE, sin Wi-Fi, servidor, cuenta ni suscripción. El proyecto utilizará **sensores de corriente ACS** y paneles reutilizados de **250–330 W de potencia nominal**. Faltan el modelo ACS exacto, esquema, datos eléctricos del panel y especificaciones de batería/controlador/BMS. Esta guía no confirma instalación ni compatibilidad sin esa verificación.

## Arquitectura

Panel → ACS de corriente + medición independiente de voltaje → controlador → batería con BMS → convertidores y seis salidas.

Tres canales de corriente: entrada solar, batería bidireccional y consumo total en el bus de salida. Las señales ACS y de voltaje, acondicionadas y calibradas, llegan al ADC del ESP32 o a uno externo compatible. Después: ESP32 → GATT BLE → app → SQLite. Pueden utilizarse datos equivalentes del controlador/BMS si están disponibles y documentados. No se presupone que los tres canales ya estén instalados. La batería muestra el balance neto mientras el solar puede abastecer simultáneamente las salidas.

## Sensor elegido: ACS

Se mantiene **ACS como familia elegida**. Referencia, variante, rango y módulo están pendientes de confirmación. Las siguientes fichas permiten identificar el componente; no afirman cuál está instalado:

| Referencia del fabricante                                                                                               | Características relevantes                                                              | Verificación necesaria                                     |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [ACS712 · Allegro](https://www.allegromicro.com/en/products/sense/current-sensor-ics/integrated-current-sensors/acs712) | Hall de corriente, alimentación de 5 V y salida analógica; sensibilidad según variante. | Modelo/rango exactos y acondicionamiento para el ADC.      |
| [ACS758 · Allegro](https://www.allegromicro.com/en/products/sense/current-sensor-ics/integrated-current-sensors/acs758) | Hall de corriente, alimentación de 3–5,5 V y salida analógica.                          | Sufijo, rango, dirección de corriente y niveles de salida. |

Calibrar cero y sensibilidad de cada canal. Para una salida lineal: `I = (V_salida − V_cero) / sensibilidad`, incorporando cualquier divisor o acondicionamiento. La orientación del canal de batería debe dar positivo en carga y negativo en descarga. No conectar una salida de 5 V a una entrada incompatible del ESP32.

**ACS mide corriente, no voltaje ni SOC.** Temperatura de batería requiere una sonda en celdas o un dato del BMS con ubicación conocida. SOC necesita capacidad, química y un método validado; integrar corriente exige calibración de offset, rendimiento y referencia inicial. No estimar SOC solo con voltaje. SOH y ciclos necesitan información documentada del BMS u otro método validado.

## Paneles de 250–330 W: voltaje y dimensionamiento

**W es potencia; V es voltaje.** La potencia nominal no permite fijar la tensión ni garantizar compatibilidad. Registrar modelo, **Vmp, Imp, Voc, Isc**, coeficiente térmico de Voc y configuración serie/paralelo.

- **Voltaje:** medición independiente, mediante divisor resistivo filtrado/protegido o transductor adecuado. Dimensionar para Voc máximo en frío, tolerancias y transitorios. El panel nunca se conecta directamente al ADC.
- **Divisor:** `V_ADC = V_panel × R_inferior / (R_superior + R_inferior)`. Elegir resistencias después de conocer la tensión máxima y el rango útil del ADC. Revisar potencia/tensión de resistencias, impedancia de adquisición, fugas y protección.
- **Corriente:** dimensionar ACS y módulo completo con corriente máxima prevista, Isc, transitorios, dirección, precisión, bornes, pistas y disipación. El aislamiento del chip no garantiza el del módulo ni el del conjunto con la medición de voltaje conectada.
- **Potencia:** `P_panel = V_panel × I_panel`, con canales calibrados y muestras próximas en el tiempo. Ejemplo matemático, no especificación: 330 W / 30 V = 11 A. No se está asignando 30 V al panel real.
- **Controlador:** comprobar sus límites solares y compatibilidad con la batería. Una etiqueta de 330 W no autoriza cualquier controlador ni permite calcular la corriente máxima de batería solo a partir de Imp.

El rango del ADC depende de la variante de ESP32 y de su atenuación. Consultar [ADC de Espressif](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/adc/) y [calibración](https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/adc/adc_calibration.html); para C3/S3 utilizar la documentación de esa variante. No asumir un rango útil de 0–3,3 V por alimentar la placa a 3,3 V.

## ESP32 y conectividad

| Placa                                                                      | Uso propuesto                                                      |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [ESP32-C3](https://documentation.espressif.com/esp32-c3_datasheet_en.html) | Telemetría BLE; verificar ADC, GPIO y niveles de la placa elegida. |
| [ESP32-S3](https://documentation.espressif.com/esp32_s3_datasheet_en.pdf)  | Alternativa cuando se necesitan más recursos o periféricos.        |

Se conserva la placa existente si cumple los requisitos. BLE permite conexión Android directa sin infraestructura. Wi-Fi local requeriría configuración y no forma parte de esta implementación. No se usa Bluetooth clásico SPP.

## Conexiones y BOM por confirmar

- ESP32 existente o placa compatible, alimentación regulada y desacoplo. Confirmar GPIO/ADC disponibles y pines de arranque.
- Hasta tres canales ACS: panel, batería y consumo total. Variante bidireccional en batería; alimentación, rango y sensibilidad por confirmar. Omitir un canal físico solo si hay medición equivalente fiable del controlador/BMS.
- Canales de voltaje independientes y acondicionamiento de salidas ACS para el ADC. ADC externo si los canales o la precisión interna no bastan. No se prescribe un shunt externo de medición en esta arquitectura Hall.
- Temperatura de batería mediante sonda o BMS. El sensor interno del ESP32 no mide las celdas.
- Fusibles, conductores, bornes y conectores dimensionados para los máximos verificados. Cada salida requeriría su propio canal para afirmar consumo individual; la app no los presume.

Antes de comprar o cablear: confirmar SKU/módulo, cantidad, límites eléctricos, esquema, proveedor, precio, moneda, disponibilidad, transporte, impuestos y calibración. No hay precios ni rangos inventados.

Para el presupuesto energético medir consumo de la placa completa en activo/reposo y su ciclo de trabajo. `E_día = P_activo × h_activo + P_reposo × h_reposo`, incluyendo reguladores. Sin esas mediciones no se promete autonomía del ESP32.

## Servicio GATT

- Nombre anunciado: `LAPTA-` más 12 dígitos hexadecimales del eFuse, con nombre completo en respuesta de escaneo; servicio `5cba1000-7c21-4f89-a428-4c4150544100`.
- Característica NOTIFY: `5cba1001-7c21-4f89-a428-4c4150544100`.
- Transporte: JSON ASCII terminado en `\n` (NDJSON). Fragmentar en bloques de hasta MTU−3 bytes; la app solicita MTU 247, pero admite bloques de 20 bytes. Máximo 8192 caracteres de buffer. Tiempo máximo entre fragmentos: 5 s. Frecuencia objetivo: una trama cada 2 s.
- Versión `v:1`; `seq` entero creciente por conexión. Reiniciar secuencia solo al reconectar. El teléfono asigna fecha de recepción; no atribuye al firmware una hora sin RTC.
- Todos los campos de medición son opcionales. Omitir lo no medido, **no enviar cero como sustituto**. Se exige al menos una medición o una falla explícita; una alarma puede recibirse aunque un sensor no funcione. Tramas inválidas no se guardan.

```json
{
  "v": 1,
  "seq": 25,
  "solarV": 19.6,
  "solarA": 4.2,
  "batteryV": 12.8,
  "batteryA": 2.1,
  "loadW": 49.8,
  "soc": 72,
  "usableWh": 184,
  "fullUsableWh": 256,
  "temperature": 30,
  "faults": []
}
```

Este ejemplo documenta el formato; no representa una lectura del prototipo ni asigna ese voltaje a los paneles de 250–330 W. `batteryA` positivo = carga, negativo = descarga. V, A, W, Wh, °C, SOC/SOH en %, ciclos entero. `usableWh`, `fullUsableWh` y `loadW` deben usar la misma frontera energética. Con el sensor total en el bus que alimenta los convertidores, `loadW` incluye sus pérdidas y los Wh utilizables se refieren a ese bus después de la reserva; no descontar otra vez las pérdidas que ya están en el consumo. Si se mide potencia final entregada a dispositivos, el firmware debe estimar Wh entregables después de conversión. Documentar la calibración y frontera elegidas. `solarTodayWh` opcional debe ser contador diario real del controlador y reiniciarse según día local. `soh` y `cycles` son opcionales.

`faults`: `solar`, `bms`, `controller`, `overcurrent`, `temperature`, `low`, `critical`. Reportar únicamente fallas confirmadas por hardware. Generación baja sola no significa panel averiado.

`limits` opcional: `lowSoc`, `criticalSoc`, `maxTemperature`, `maxBatteryA`. Deben salir de la ficha del pack/BMS/controlador validado. Sin límites no hay avisos por comparación genérica, aunque sí se muestran fallas explícitas. La app no sustituye las protecciones físicas.

Los límites de parser (100 V, ±200 A, 10 kW) son defensas contra datos malformados, **no rangos eléctricos permitidos del prototipo**. Ajustar junto con el hardware.

## Cálculos y límites operativos

Potencia solar = V_panel × I_panel; potencia neta de batería = V_batería × I_batería. Autonomía sin sol = Wh utilizables / W de consumo. Tiempo de carga = (Wh útiles completos − Wh útiles actuales) / W netos de carga; aproximación a potencia constante, no predicción del final de carga.

La energía registrada se integra por trapecios en Wh. No integrar huecos >15 s, tiempos negativos, cambios de dispositivo ni cambios real/demo. No se recuperan lecturas durante desconexiones. La pantalla muestra fecha de datos guardados y no los presenta como actuales. El modo demo usa base separada por columna `source` y equipo `LAPTA-DEMO`.

La app reconecta con espera exponencial 1–30 s; desconectar manualmente cancela reintentos. Al reiniciar, el usuario puede reconectar la estación recordada. Monitoreo solo con app abierta: no hay servicio Android en segundo plano. Identificar por UUID no autentica la estación; antes de distribución a terceros definir bonding y autenticación con el firmware.

La demostración conserva su escenario entre reinicios. Cambiar de escenario abre una sesión simulada nueva con su batería inicial; no se integra energía ni se une la curva entre sesiones. El historial anterior permanece identificado como simulado. Esta separación no altera el protocolo del ESP32 ni los datos reales.

## Pruebas de banco pendientes

1. Confirmar modelo ACS, Vmp/Imp/Voc/Isc del panel de 250–330 W, Voc en frío, esquema, ADC y química; completar límites y capacidades.
2. Calibrar cero y sensibilidad ACS y canales de voltaje contra instrumentos en varios puntos; revisar ruido, temperatura, saturación, polaridad y signo de batería.
3. Verificar balance solar, batería y consumo con pérdidas y energía acumulada de referencia.
4. Ensayar desconexión, apagado, alcance, fragmentación de 20 bytes, JSON inválido, reinicio y reconexión sin duplicados.
5. Contrastar temperatura con sonda y fallas de BMS usando procedimientos del fabricante.
6. Teléfono en modo avión con Bluetooth activado: demo, conexión, historial y reapertura offline.

## Cambios de aplicación que afectan la integración

El acceso por código requiere el nombre BLE descrito y no constituye autenticación criptográfica. «Salir de mi LAPTA» desconecta y cancela reintentos sin borrar historial. El aviso de reserva de 20 % requiere SOC actual y no sustituye límites del BMS. La vida útil del panel permanece pendiente de evaluación, sin derivarla de V/I instantáneos. El modo pitch ×360 y las horas decimales pertenecen solo a la demo; `demoRate` es metadata local, no un campo requerido del ESP32. Cambiar a ACS no altera los campos BLE: el firmware debe enviar V/A/W calibrados, no valores ADC crudos.
