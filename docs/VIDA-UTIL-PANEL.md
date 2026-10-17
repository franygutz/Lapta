# Vida útil del panel reutilizado

La app muestra «Aún no evaluada», también en demostración. No asigna años restantes ni un porcentaje de salud sin una evaluación trazable. Voltaje, corriente y potencia instantáneos no bastan para separar desgaste de cambios de luz, temperatura, sombra o suciedad.

Para evaluar degradación se requiere caracterizar el módulo con pruebas comparables (por ejemplo, curvas I–V y potencia máxima con irradiancia y temperatura controladas o corregidas), conocer sus especificaciones y disponer de mediciones de referencia. Eso permite estimar pérdida de rendimiento; no equivale por sí solo a predecir una fecha de fallo.

El proyecto PV Lifetime de NREL retira módulos del campo para medirlos bajo condiciones constantes de irradiancia y temperatura y estudiar su degradación: [PV Lifetime Project, informe anual 2024](https://www.nrel.gov/docs/fy24osti/90651.pdf). La medición rutinaria del ESP32 no implementa ese ensayo. Hace falta revisión técnica del panel reutilizado antes de publicar un resultado.
