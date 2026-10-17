# LAPTA · Energía solar a tu alcance

Aplicación Android para monitorear una estación portátil que reutiliza paneles solares de **250 a 330 W de potencia nominal**. Muestra batería disponible, generación y consumo mediante Bluetooth Low Energy, sin internet, cuentas ni servidores.

**El sensor de corriente elegido es ACS.** Su modelo y rango exactos están pendientes de confirmación. El ACS mide corriente; el voltaje necesita un canal de medición independiente. **250–330 W indica potencia, no voltaje.**

## Instalar y abrir

1. Copia [`dist/LAPTA.apk`](dist/LAPTA.apk) al teléfono Android.
2. Abre el archivo desde Archivos y permite instalar desde esa aplicación si Android lo solicita.
3. Instala LAPTA. Para actualizar, instala sobre la versión anterior conservando sus datos.
4. Elige **Conectar mi LAPTA** o **Probar sin estación**.

El APK incluye código, fuentes y marca; no necesita computadora, Metro, hosting ni internet para ejecutarse. La compilación entregada admite Android 7 o superior en ARM64 y x86_64. **Expo Go no sirve para esta app:** BLE requiere compilación nativa.

## Entrada por código y salida

La primera pantalla pide el código de la etiqueta de la estación, por ejemplo `LAPTA-A1B2C3D4E5F6`. Con el prototipo encendido y cerca, la app solicita permisos de Android, busca su servicio BLE y conecta al equipo cuyo nombre coincide con el código.

El firmware de ejemplo genera ese identificador a partir del eFuse del ESP32 y lo imprime por Serial para preparar la etiqueta. Un firmware que anuncie solo `LAPTA` necesita actualizar su nombre. El código identifica al equipo; no crea una cuenta ni es una contraseña criptográfica. [Detalles de identificación](docs/ACCESO-POR-CODIGO.md).

En Ajustes, **Salir de mi LAPTA** desconecta Bluetooth, cancela reintentos, detiene la demo, olvida el código y el dispositivo recordados y devuelve a la entrada. Conserva el historial y la apariencia. **Conectar otra LAPTA** vuelve a la entrada manteniendo el código como ayuda. Si hay un código guardado, la entrada permite consultar los datos almacenados sin conectar.

## Interfaz sencilla

| Sección       | Lo que muestra                                                                                                             |
| ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Inicio**    | Porcentaje de batería, carga o descarga, tiempo de uso estimado y aporte solar en lenguaje sencillo.                       |
| **Energía**   | Estado del panel y evaluación de vida útil; voltaje, corriente, potencia, producción y flujo energético al abrir detalles. |
| **Batería**   | Carga disponible; datos eléctricos, temperatura, salud y ciclos cuando existan mediciones válidas.                         |
| **Salidas**   | Las seis conexiones y su capacidad nominal.                                                                                |
| **Historial** | Hoy, siete o treinta días; evolución de batería, estadísticas adicionales y exportación CSV de hasta 2.000 registros.      |
| **Ajustes**   | Dispositivo real o demo, escenarios, modo pitch, tema, ayuda y salida.                                                     |

Energía, Batería y Salidas están agrupadas para mantener solo cuatro pestañas inferiores. **Ver detalles** revela la información técnica cuando se necesita. No hay tutorial obligatorio: **Ayuda rápida** ofrece una sola tarjeta y las etiquetas de las mediciones explican sus unidades al tocarlas.

Incluye temas **claro, oscuro y automático**, interfaz en español, marca oficial y fuentes Bree Serif y Nunito Sans locales.

### Las seis salidas

| Conexión             | Capacidad nominal                              |
| -------------------- | ---------------------------------------------- |
| USB-A 01             | QC 3.0, hasta 18 W                             |
| USB-A 02             | QC 3.0, hasta 18 W                             |
| USB-C                | PD, 20–30 W según el módulo instalado          |
| Toma tipo encendedor | 12 V, hasta 120 W                              |
| Jack DC 01           | Para lámpara; tensión y potencia por confirmar |
| Jack DC 02           | Para lámpara; tensión y potencia por confirmar |

No se inventan interruptores remotos ni consumos individuales. Sin sensores por salida, se muestra el consumo total medido. Las capacidades por conector no garantizan que todas las salidas puedan trabajar simultáneamente a su máximo.

## Demostración y modo pitch

**Probar sin estación** abre las mismas pantallas con datos identificados como simulados. No necesita ESP32 ni presenta una conexión ficticia como real.

| Escenario           | Comportamiento                                     |
| ------------------- | -------------------------------------------------- |
| Sol y carga         | El solar alimenta el consumo y aumenta la reserva. |
| Sin sol y descarga  | La batería alimenta las salidas y pierde carga.    |
| Batería baja        | Permite presentar las advertencias de reserva.     |
| Condición de alerta | Muestra fallas y temperatura excesiva simuladas.   |

El **modo pitch**, activado por defecto en demo, acelera el modelo **×360**: la batería cambia visiblemente cada dos segundos y la autonomía aparece en horas decimales, sin minutos. Puede desactivarse en Ajustes. **No modifica la velocidad ni los valores del dispositivo real.**

Para presentar: abre la demo, muestra Inicio y alterna **Sol y carga** / **Sin sol y descarga** desde Ajustes. Cambiar de escenario o velocidad abre una sesión simulada nueva para no unir saltos en las gráficas. El escenario y la opción de pitch se conservan al reabrir.

En Ajustes → información avanzada también se puede practicar búsqueda, conexión y desconexión de una estación simulada. Esa práctica no utiliza Bluetooth y es independiente de las lecturas demo.

La demo incluye tres horas iniciales de historial. Sus valores de panel y batería son ejemplos, **no especificaciones de los paneles reales de 250–330 W**. La energía demo incorpora la aceleración, mientras sus fechas corresponden al teléfono. El CSV incluye la velocidad simulada.

## Alertas, autonomía y vida útil

Una lectura actual de batería de **20 % o menos** muestra un aviso con la aplicación abierta y una advertencia visible. El diálogo se habilita de nuevo después de superar 25 %. Es una recomendación de ahorro independiente de las protecciones del BMS.

Temperatura excesiva, sobrecorriente, batería crítica y fallas dependen de límites documentados o estados enviados por el hardware. También se informa desconexión y lecturas desactualizadas. No hay servicio permanente ni notificaciones en segundo plano.

**Autonomía sin sol = energía utilizable restante (Wh) / consumo actual (W).** El tiempo de carga requiere capacidad útil y potencia neta de carga suficientes. SOC, temperatura, salud y ciclos necesitan una medición o estimación técnicamente justificada; no se inventan datos ausentes.

**Vida útil del panel:** aparece **Aún no evaluada**, con una explicación accesible al pedirla. No se asignan años restantes ni un porcentaje de salud a partir de la producción instantánea. [Fundamento y evaluación necesaria](docs/VIDA-UTIL-PANEL.md).

## Hardware: ACS y paneles de 250–330 W

La potencia nominal del panel no determina su tensión. Antes de dimensionar la entrada hay que registrar:

| Dato del panel             | Uso                                                       |
| -------------------------- | --------------------------------------------------------- |
| Vmp / Imp                  | Tensión y corriente en máxima potencia.                   |
| Voc / Isc                  | Tensión en circuito abierto y corriente de cortocircuito. |
| Coeficiente térmico de Voc | Comprobar la tensión máxima en frío.                      |
| Modelo y configuración     | Validar controlador, conexiones y medición.               |

La arquitectura usa **ACS para corriente** y un circuito de **medición de voltaje independiente**, dimensionado para el panel y el ADC. Confirmar referencia ACS, rango, alimentación, sensibilidad y niveles de salida; el canal de batería necesita medir ambos sentidos.

Para monitorear panel, batería y consumo total se necesitan tres canales de corriente y los voltajes correspondientes, o datos equivalentes del controlador/BMS. No se presupone que ya estén instalados.

El circuito de voltaje debe soportar **Voc máximo en frío**, tolerancias y transitorios, manteniendo la señal dentro del rango válido del ADC concreto. No conectar el panel ni una señal analógica incompatible directamente al ESP32. El ACS no define por sí solo la tensión máxima permitida por el controlador o el módulo completo.

El **modelo ACS y el voltaje exacto del panel están pendientes de confirmación**. [Arquitectura, conexiones, calibración y protocolo](docs/HARDWARE-Y-BLE.md).

## Funcionamiento sin internet

- BLE directo entre teléfono y ESP32; sin Firebase, Supabase, cuentas, backend ni servicios de pago.
- SQLite guarda lecturas y preferencias, separando datos reales y simulados.
- Las últimas lecturas guardadas muestran su fecha y no se presentan como actuales al desconectarse.
- La demo actualiza cada dos segundos y guarda muestras cada diez; la frecuencia real depende del firmware.
- La integración en Wh no une huecos mayores de quince segundos, distintos dispositivos, orígenes, sesiones o escalas demo. Los períodos sin lecturas no se rellenan.

## Desarrollo y compilación

**React Native + Expo SDK 55 + TypeScript estricto**, BLE con `react-native-ble-plx`, almacenamiento `expo-sqlite`, gráficos `react-native-svg` y validación Zod.

Requisitos: Node compatible con Expo —verificado con Node 24—, JDK 21 y Android SDK, con `JAVA_HOME` y `ANDROID_HOME`. La entrega se compiló con SDK Android 36, NDK 27.1 y CMake 3.22.1. La instalación inicial de dependencias y herramientas requiere internet; ejecutar el APK no.

```powershell
npm.cmd ci
npm.cmd run android
```

`android` compila y abre la versión de desarrollo en un emulador o teléfono autorizado por ADB. `npm.cmd start` inicia Metro para desarrollo; no es necesario para el APK release.

Para verificar y generar el instalador:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run apk
```

El script ejecuta Expo prebuild y Gradle `assembleRelease`, y copia el resultado a **`dist/LAPTA.apk`**. La firma actual usa una clave de desarrollo: antes de distribución pública, configurar una propia y conservarla para futuras actualizaciones. `npm.cmd run bundle:android` verifica el bundle por separado.

## Estado de entrega

| Implementado y verificado                                                  | Pendiente de integración física                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------ |
| APK, navegación simplificada, temas y ayuda opcional.                      | Confirmar ACS exacto, placa, cableado y rangos.        |
| Entrada por código, demo, pitch y salida.                                  | Confirmar Vmp, Voc, Imp e Isc del panel de 250–330 W.  |
| SQLite, historial, CSV, gráficas y cálculos.                               | Implementar y calibrar `readSensors()` en ESP32.       |
| BLE nativo, permisos, búsqueda, notificaciones y reconexión implementados. | Validar conexión y reconexión con ESP32 físico.        |
| TypeScript, lint, 15 pruebas y recorridos en emulador Android.             | Contrastar SOC, temperatura y fallas con sensores/BMS. |
| Vida útil presentada sin cifras inventadas.                                | Evaluación técnica del panel reutilizado.              |

El [firmware incluido](firmware/lapta_ble/lapta_ble.ino) es una base de transporte BLE e identificación, **no firmware completo de sensores ni de protección**. `readSensors()` no envía datos inventados. La app recibe voltios, amperios y watts calibrados: elegir ACS no requiere cambiar las pantallas ni el contrato BLE.

## Documentación y recursos

- [Hardware ACS y protocolo BLE](docs/HARDWARE-Y-BLE.md).
- [Acceso por código](docs/ACCESO-POR-CODIGO.md).
- [Vida útil del panel](docs/VIDA-UTIL-PANEL.md).
- [Pruebas, capturas y limitaciones](docs/QA.md).
- [`identidad-marca/`](identidad-marca/): SVG oficiales. `node scripts/brand-assets.cjs` prepara recursos nativos sin rediseñar la marca.

Los avisos transitivos de herramientas npm están documentados en QA. No aplicar actualizaciones forzadas sin revisar compatibilidad con Expo.
