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

## Ayuda y conexión de demostración

**Revisión posterior:** el recorrido de seis pasos descrito a continuación corresponde a la versión anterior. La versión actual abre con código de estación, omite la bienvenida obligatoria y ofrece una única tarjeta de ayuda en Ajustes. Inicio, Energía, Batería e Historial muestran primero información breve y despliegan datos técnicos al pedirlos. Ver [acceso por código](ACCESO-POR-CODIGO.md). El recorrido vigente es `python scripts/android-simple-smoke.py`.

Recorrido vigente aprobado en Android: entrada, código inválido, demo sin tutorial, Inicio sin consumo técnico visible, despliegue de detalles, ayuda breve y regreso a la entrada. Capturas: [entrada](capturas/13-entrada-codigo.png), [Inicio simple](capturas/14-inicio-simple.png), [ayuda breve](capturas/15-ayuda-breve.png). TypeScript, lint, 13 pruebas y APK release aprobados. Los intentos iniciales encontraron bloqueos de System UI y un selector que pulsaba controles parcialmente tapados por las pestañas; se corrigió el selector del controlador de pruebas y el recorrido final pasó. No se verificó el identificador con un ESP32 físico.

Se añadió una bienvenida de seis pasos que explica %, W, Wh, V y A con ejemplos cotidianos. Su cierre se recuerda en SQLite. «Entender mi energía» permite volver a abrirla desde cualquier sección y las etiquetas de las mediciones abren explicaciones específicas.

En Ajustes → Modo demostración se puede practicar búsqueda, selección, conexión y desconexión. Este flujo no usa BLE y mantiene visibles las etiquetas de simulación. Las lecturas demo continúan independientemente de la práctica de conexión.

El aviso de reserva al 20 % es una recomendación de uso, independiente de los límites de protección enviados por el hardware. Requiere SOC recibido y lectura actual; no estima un porcentaje a partir del voltaje. Se muestra un diálogo con la app abierta y una advertencia persistente mientras SOC ≤20 %. Se vuelve a habilitar después de superar 25 %; no notifica en segundo plano.

Recorrido adicional: `python scripts/android-learning-smoke.py` (solo emulador).

La compilación Android actualizada, TypeScript, lint y las 13 pruebas existentes pasaron. En el emulador se recorrieron la guía y su reapertura, búsqueda/conexión/desconexión simuladas y el aviso nativo de batería. Capturas: [guía](capturas/10-bienvenida.png), [conexión simulada](capturas/11-conexion-simulada.png), [aviso de batería](capturas/12-aviso-bateria.png). El primer intento perdió una pulsación durante bloqueos de System UI; se añadieron esperas por paso. El segundo llegó al aviso y requirió corregir el selector del botón nativo, que Android muestra en mayúsculas (`ENTENDIDO`).

## Revisión para pitch

Modo pitch activado por defecto solo en demostración, con factor ×360 y opción de desactivarlo en Ajustes. El modelo actualiza la reserva cada dos segundos; las potencias siguen siendo W, y la integración de energía demo multiplica el intervalo por la escala registrada. Los cambios de velocidad o escenario separan sesiones para evitar integrar saltos. CSV incluye la velocidad simulada. Las marcas de fecha siguen correspondiendo al teléfono: la energía demo representa tiempo acelerado, no producción real de ese día. Las lecturas reales ignoran esta escala.

En modo pitch la autonomía se presenta en horas decimales, sin minutos. En modo normal y dispositivo real se conserva la duración habitual. «Salir de mi LAPTA» desconecta BLE, detiene el modelo demo, borra la estación recordada y regresa a la entrada sin borrar el historial ni las preferencias de apariencia.

La vida útil del panel se muestra como pendiente de evaluación en ambas modalidades, sin años ni porcentajes inventados. Ver [fundamento y límites](VIDA-UTIL-PANEL.md).

TypeScript, lint y 15 pruebas aprobados, incluidas aceleración del modelo e integración y exclusión de la escala en lecturas reales.

APK release generado e instalado. Recorrido Android final aprobado: entrada y demo, detalles, vida útil pendiente de evaluación, ayuda breve, desactivar/reactivar modo pitch y salir a la entrada sin estación recordada. Se revisaron visualmente [Inicio sin minutos](capturas/14-inicio-simple.png) y [vida útil del panel](capturas/16-vida-util-panel.png). El primer intento encontró los bloqueos de System UI ya documentados; el segundo completó el recorrido. No se probó desgaste físico del panel ni se estimaron años restantes.

## Validación física pendiente

Teléfono físico con Bluetooth activo, permisos denegados, descubrimiento y conexión a ESP32, pérdida de señal/reconexión, lecturas reales desactualizadas, calibración, falta de espacio, TalkBack y texto ampliado. Controles principales >=48 dp. El flujo respeta reducción de movimiento. No hay un servicio permanente de monitoreo en segundo plano.

Un teléfono USB fue detectado como unauthorized: no se instaló en ese teléfono. El APK sí se instaló y ejecutó en el emulador x86-64. La app no fue calibrada contra sensores físicos ni se afirma una conexión BLE exitosa con el prototipo. El firmware incluido es únicamente la base de transporte y requiere implementar sensores reales.
