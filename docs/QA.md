# Verificación LAPTA

## Evidencia

- TypeScript estricto: aprobado.
- 13 pruebas aprobadas: cálculos W/Wh/autonomía/carga incluyendo consumos menores de 1 W, separación exacta en cruces de carga/descarga, datos ausentes y cobertura, huecos y aislamiento por dispositivo/origen/sesión, validación de tramas, límites y alertas, escenarios demo, batería agotada, alarmas sin sensores, capacidades y umbrales contradictorios, fragmentación BLE, timeout y persistencia SQLite.
- `npm.cmd run lint`: aprobado, sin errores ni advertencias.
- SQLite probado con motor real de Node y con `expo-sqlite` en Android: escritura, historial, preferencias, reapertura y separación real/demo aprobados.
- Exportación Android Hermes con fuentes y marca locales: aprobada. `assembleRelease` y Android lint vital: aprobados. APK firmado en `dist/LAPTA.apk`, aproximadamente 46,6 MB, para ARM64 y x86-64 (Android 7 o posterior).
- `python scripts/android-smoke.py`: aprobado en emulador Android API 36, sin Metro, con modo avión, Wi-Fi/datos apagados y movimiento reducido. Verifica Inicio, Energía, Batería, Salidas, períodos de historial, selección en gráfica, noche/descarga, alertas, reinicio de escenarios, tema claro/oscuro, reapertura, modo real persistente y error comprensible con Bluetooth apagado. La batería ficticia vuelve a su condición inicial al cambiar de escenario.
- Expo install --check: dependencias compatibles, React Native 0.83.10.
- npm audit: 32 avisos transitivos (11 moderados, 21 altos) en árbol Expo/CLI/Metro, entre otros. No se aplicaron cambios incompatibles sugeridos por npm. Revisar actualización de SDK antes de distribución pública.

## Trazabilidad

|Requisito|Implementación|Prueba|
|---|---|---|
|Batería, autonomía y carga|Inicio / Batería|Unitarias de cálculo|
|Generación y falla confirmada|Energía / faults.solar|Validación de protocolo|
|Flujo neto simultáneo|Solar, batería y consumo|Balance de demostración|
|Seis salidas|Capacidades nominales, sin interruptores ficticios|Revisión de implementación|
|Historial W/Wh/SOC|SQLite y gráficas interactivas|SQL, filtros y selección de registros aprobados en Android|
|BLE|Permisos, scan, connect, NOTIFY y reconexión|Parser, inicialización nativa y Bluetooth apagado probados; ESP32 pendiente|
|Temas y preferencias|Claro, oscuro y automático|Claro/oscuro y persistencia verificados en Android; automático sigue Appearance del sistema|
|Offline|Fuentes y recursos locales|Inicio y reapertura aprobados en modo avión|

## Recorrido de presentación (3–5 minutos)

1. Abrir en demo y reconocer la banda amarilla. Consultar batería, autonomía y panel.
2. Explorar flujo y seis salidas; distinguir W instantáneos de Wh registrados.
3. Historial: cambiar período, tocar la gráfica o usar Anterior/Siguiente y compartir CSV.
4. Ajustes: activar oscuro, noche, batería baja y alerta. Cerrar/reabrir para comprobar datos y preferencias.
5. Modo real: permisos, búsqueda y conexión solo cuando exista firmware compatible.

## Capturas de Android

[Inicio claro](capturas/01-inicio-claro.png), [batería](capturas/02-bateria.png), [salidas](capturas/03-salidas.png), [historial](capturas/04-historial.png), [gráfica interactiva](capturas/04b-grafica-interactiva.png), [alertas](capturas/05-alertas.png), [oscuro](capturas/06-inicio-oscuro.png), [reapertura offline](capturas/07-reapertura-offline.png), [modo real sin datos](capturas/08-real-sin-datos.png), [Bluetooth apagado](capturas/08b-bluetooth-apagado.png), [modo real persistente](capturas/09-modo-real-persistente.png).

El primer arranque del emulador mostró bloqueos de Pixel Launcher/System UI. El controlador de pruebas cierra esos procesos del sistema y falla explícitamente si un bloqueo corresponde a LAPTA. El recorrido final terminó aprobado.

## Validación física pendiente

Teléfono físico con Bluetooth activo, permisos denegados, descubrimiento y conexión a ESP32, pérdida de señal/reconexión, lecturas reales desactualizadas, calibración, falta de espacio, TalkBack y texto ampliado. Controles principales >=48 dp. El flujo respeta reducción de movimiento. No hay un servicio permanente de monitoreo en segundo plano.

Un teléfono USB fue detectado como unauthorized: no se instaló en ese teléfono. El APK sí se instaló y ejecutó en el emulador x86-64. La app no fue calibrada contra sensores físicos ni se afirma una conexión BLE exitosa con el prototipo. El firmware incluido es únicamente la base de transporte y requiere implementar sensores reales.
