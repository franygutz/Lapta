# LAPTA · Android

Aplicación nativa React Native + Expo SDK 55 y TypeScript estricto. BLE directo a ESP32, SQLite local, fuentes Bree Serif / Nunito Sans y marca oficial incluidas. Sin cuentas, hosting ni servicios de pago. La instalación de herramientas y primera compilación sí requieren internet.

## Ejecutar y generar APK

Requisitos: Node compatible con Expo, Android SDK, JDK 17/21 y variables `JAVA_HOME` / `ANDROID_HOME`. En esta máquina existe JDK 21 en `C:/Program Files/Android/Android Studio/jbr`.

```powershell
npm.cmd install
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run bundle:android
npm.cmd run apk
```

El script genera el proyecto Android con Expo, ejecuta Gradle `assembleRelease` y copia el instalador a `dist/LAPTA.apk`. El release incluye JavaScript y recursos; funciona sin Metro ni internet. Expo Go no admite este módulo BLE: usar compilación nativa.

La plantilla firma release con clave de desarrollo. Antes de distribuir públicamente, configurar una clave propia y conservarla para futuras actualizaciones. Para desarrollo: `npm.cmd run android`.

## Uso y almacenamiento

Primera apertura: demostración claramente identificada, con tres horas iniciales de historial. Ajustes permite usar el dispositivo real y cambiar entre claro, oscuro y automático. Los escenarios de sol/carga, noche/descarga, batería baja y alerta usan las mismas pantallas que el hardware.

El escenario se conserva al reabrir. Cambiar de escenario reinicia su batería ficticia en una sesión nueva, sin borrar historial ni integrar energía entre sesiones distintas. La demostración nunca se utiliza como lectura real.

Inicio prioriza batería, autonomía y solar. Energía agrupa panel, batería y exactamente seis salidas. Historial consulta hoy/7/30 días, gráficas W/Wh/SOC y comparte CSV mediante Android. Los registros reales y simulados permanecen separados.

La interfaz demo actualiza cada 2 segundos y SQLite registra muestras cada 10 segundos. La frecuencia real depende del firmware. La energía se integra por trapecios, sin huecos mayores de 15 segundos ni cambios de dispositivo/origen. Lo registrado no equivale a un día completo sin interrupciones.

Autonomía sin sol = Wh utilizables en las salidas / W de consumo. SOC, energía utilizable, temperatura, SOH y ciclos deben tener una fuente técnicamente justificada. El modo real no inventa valores, interruptores ni consumos individuales. Las lecturas antiguas muestran su fecha. Los límites de alerta reales deben proceder de las especificaciones del hardware.

BLE incluye permisos Android, búsqueda por UUID, selección, conexión, notificaciones fragmentadas y reconexión exponencial de 1 a 30 segundos. Desconectar cancela los reintentos; al reiniciar, se puede reconectar la estación recordada desde Ajustes. Monitoreo con app abierta, sin servicio permanente en segundo plano.

## Integración física

Consultar [sensores, conexiones y protocolo BLE](docs/HARDWARE-Y-BLE.md) y [evidencia de QA y pendientes](docs/QA.md). Se comparan INA219/INA226/INA228 y ESP32-C3/S3, con BOM sin precios inventados y plan de calibración. Los PNG de la app se rasterizan directamente desde los tres SVG oficiales con `node scripts/brand-assets.cjs`; no se rediseñan las marcas.

El [firmware de transporte](firmware/lapta_ble/lapta_ble.ino) anuncia LAPTA y expone NOTIFY. `readSensors()` está pendiente de los sensores reales y no envía datos ficticios. Es una base de integración, no firmware completo de carga y protección.

Se requieren esquema del prototipo, química/capacidad de batería, sensores calibrados y especificaciones del controlador/BMS. No se afirma conexión física exitosa sin esa validación. El árbol de herramientas tiene avisos transitivos de npm documentados en QA; no aplicar `npm audit fix --force` sin revisar compatibilidad Expo.
