---
title: "EasterBunny: el artefacto de espionaje de APT29 que tardó seis años en ver la luz"
date: 2026-06-18
category: malware
category_label: Malware
ref: "2026-004"
difficulty: 3
tags: [apt29, espionaje, dll-side-loading, inteligencia-amenazas, lab52]
excerpt: "Por qué un incidente de 2019 atribuido a APT29 se hizo público recién en 2025-2026, y qué nos sigue enseñando sobre cómo opera uno de los actores de amenazas más persistentes vinculados a inteligencia rusa."
---

No todos los informes de amenazas se publican cuando ocurre el incidente. EasterBunny es un buen ejemplo de por qué: un conjunto de artefactos recopilados durante la respuesta a un incidente en 2019, vinculado mediante investigación exhaustiva a APT29, y que no vio la luz pública hasta que fue desclasificado a partir de noviembre de 2025. LAB52 (la división de inteligencia de amenazas de S2 Grupo) lo documentó en un informe completo publicado en mayo de 2026.

Este writeup recoge lo que se sabe de la campaña y, sobre todo, por qué sigue siendo relevante seis años después.

## 1. Quién es APT29

APT29 es un grupo de amenazas persistentes avanzadas presuntamente vinculado a uno o más servicios de inteligencia rusos. Lleva activo desde al menos 2008, dirigiendo sus campañas principalmente contra gobiernos europeos y agencias diplomáticas. Es uno de los actores más estudiados del panorama de ciberespionaje estatal, junto a grupos como APT28, con los que comparte objetivos pero no necesariamente técnicas.

A diferencia de actores motivados económicamente, el objetivo de APT29 no es el robo de datos para monetizar ni el ransomware: es la recolección sostenida de inteligencia, lo que implica permanecer sin ser detectado durante el mayor tiempo posible.

## 2. Por qué un incidente de 2019 se publica en 2026

La cronología de EasterBunny tiene un patrón poco habitual en threat intelligence pública:

- **2019**: durante un servicio de gestión de incidentes de S2 Grupo, LAB52 obtiene acceso a un conjunto de artefactos y una gran cantidad de evidencia recopilada durante el incidente.
- **2019–2025**: la investigación permite vincular la campaña, calificada como altamente sofisticada, a APT29 — pero la información permanece sin publicar.
- **Noviembre 2025**: la información sobre estos artefactos se desclasifica.
- **Mayo 2026**: LAB52 compila los resultados en un informe detallado y lo publica.

Este desfase no es inusual en investigaciones ligadas a incidentes con componente de inteligencia: los acuerdos de confidencialidad con la víctima, las implicaciones de atribución a un estado, y la posible utilidad continuada de la información para investigaciones activas son motivos habituales para retrasar la publicación de hallazgos durante años.

Lo interesante, según LAB52, es que la campaña sigue ofreciendo hoy información valiosa sobre el despliegue de malware en ataques dirigidos — no se trata de un artefacto obsoleto sin interés, sino de un caso de estudio que conserva validez técnica para la comunidad.

## 3. Cómo opera típicamente APT29 (contexto de TTPs)

LAB52 no detalla en este post en concreto las técnicas específicas usadas en el incidente de 2019 (esa profundidad queda reservada al informe completo y a su feed de inteligencia privado). Pero sí ha documentado extensamente, en otras campañas posteriores atribuidas al mismo actor, un patrón de comportamiento consistente que vale la pena conocer como referencia:

**Vector de entrada.** El correo electrónico sigue siendo la vía principal. El patrón habitual: un PDF adjunto con un enlace que descarga un archivo ISO — un formato que evade muchos controles de seguridad de correo al no ser un ejecutable directo y al aprovechar que Windows monta ISOs como unidades virtuales sin avisos adicionales.

**DLL side-loading con binarios firmados.** Una técnica recurrente en campañas posteriores de este actor consiste en usar un ejecutable legítimo, a menudo firmado digitalmente por un proveedor de confianza, para cargar una DLL maliciosa colocada junto a él. El binario legítimo no está comprometido en sí mismo — simplemente se aprovecha de cómo Windows resuelve las dependencias de DLL, cargando la versión maliciosa que se encuentra en el mismo directorio en lugar de (o antes de) la del sistema.

**Inyección de shellcode en memoria de DLLs legítimas.** En evoluciones posteriores de su malware, el grupo ha pasado de reservar memoria en su propio proceso a escribir el shellcode directamente en la sección `.text` de una DLL legítima del sistema, tras mapearla en memoria y modificar temporalmente sus permisos. El objetivo es el mismo en ambos casos — ejecutar código arbitrario — pero la segunda variante complica considerablemente el análisis forense, porque el código malicioso convive físicamente con código legítimo de Windows en la misma región de memoria.

**Evolución continua de C2 y ofuscación.** Las campañas sucesivas (a las que LAB52 ha dado nombres como "Note", "Information" o variantes posteriores) muestran cambios incrementales: distinto nombre de archivo para el shellcode, distinta lógica del cargador, distinto servidor de mando y control. Esto es coherente con un actor maduro que itera su tooling en respuesta a la detección, no que lo reconstruye desde cero.

## 4. Qué nos enseña esto sobre defensa

Aunque los detalles técnicos exactos de EasterBunny permanezcan en el informe completo, el patrón general de operación de APT29 sí ofrece líneas de defensa concretas:

Limitar o inspeccionar el montaje automático de imágenes ISO recibidas por correo es una medida de bajo coste con alto impacto, dado lo recurrente que es este vector en campañas de actores vinculados a inteligencia estatal.

La firma digital de un binario no implica que su comportamiento en ejecución sea seguro — el monitoreo de qué DLLs carga un proceso firmado y desde qué ruta puede detectar side-loading incluso cuando el ejecutable principal es perfectamente legítimo.

La inyección en memoria de procesos legítimos es difícil de detectar con firmas estáticas; aquí es donde el EDR con capacidad de inspeccionar cambios de permisos de memoria en tiempo de ejecución (por ejemplo, una sección marcada como ejecutable que pasa por escribible y vuelve a ejecutable en un corto intervalo) aporta una capa de detección que la inspección de archivos en disco no puede ofrecer.

## Conclusión

EasterBunny es, ante todo, un recordatorio de que buena parte de la inteligencia de amenazas real no se publica en el momento del incidente, sino años después, cuando las circunstancias lo permiten. Eso no la hace menos valiosa: el patrón de comportamiento de un actor como APT29 — vector de email con ISO, DLL side-loading sobre binarios firmados, inyección de shellcode en memoria de librerías legítimas — se repite y evoluciona a lo largo de los años, y reconocerlo en una campaña de 2019 ayuda a anticiparlo en la próxima campaña, sea cual sea su nombre.

*Nota: este writeup se basa en la información pública compartida por LAB52 (S2 Grupo) y en el contexto de TTPs documentado en sus análisis de campañas relacionadas con el mismo actor. El informe técnico completo de EasterBunny no está disponible en abierto.*
