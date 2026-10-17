# Acceso por código, sin cuenta

La app abre con el código de la estación. El botón «Probar sin estación» abre la demostración. No hay registro de personas, contraseña ni servidor. Las lecturas guardadas se pueden consultar sin conectar.

Cada ESP32 anuncia `LAPTA-` seguido de los 12 dígitos hexadecimales de su identificador eFuse (48 bits). El ejemplo de firmware imprime ese código por Serial al arrancar; debe colocarse en una etiqueta de la estación. La app busca el servicio BLE oficial y conecta automáticamente solo al nombre que coincide con el código escrito. Los equipos con firmware anterior que anuncian únicamente «LAPTA» necesitan actualizar ese nombre. La respuesta de escaneo anuncia el nombre completo porque no cabe junto al UUID en un único paquete de publicidad.

El código identifica el equipo; **no es una contraseña ni autenticación criptográfica**. Una implementación que requiera acceso exclusivo debe agregar emparejamiento BLE seguro y autorización en firmware, y probarla en hardware. No se afirma que un identificador público proteja el prototipo frente a otro cliente BLE.

Inicio muestra batería, estado, tiempo de uso estimado y aporte solar en lenguaje cotidiano. W, Wh, gráficas y estadísticas se despliegan al pulsar «Ver detalles». La ayuda ya no aparece obligatoriamente al iniciar: es una tarjeta breve en Ajustes. Las explicaciones de unidades siguen disponibles tocando sus etiquetas.

Validación física pendiente: probar publicidad y respuesta de escaneo del nombre completo en el ESP32, código correcto/incorrecto, conexión y pérdida de señal. El firmware de sensores continúa pendiente; el ejemplo no inventa mediciones.
