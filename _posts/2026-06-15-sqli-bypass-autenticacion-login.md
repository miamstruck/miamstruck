---
title: "Bypass de autenticación mediante inyección SQL en un formulario de login"
date: 2026-06-15
category: web
category_label: Web
ref: "2026-001"
difficulty: 2
ctf: "Plataforma de práctica (ejemplo educativo)"
tags: [sqli, web, autenticacion, burpsuite]
excerpt: "Cómo identificar y explotar una inyección SQL clásica en un formulario de login para saltarse la autenticación, paso a paso y con su mitigación."
---

Este writeup documenta un caso clásico pero muy habitual en CTFs y auditorías: un formulario de login vulnerable a inyección SQL que permite saltarse la autenticación sin conocer ninguna contraseña. El objetivo es entender **por qué** funciona, no solo copiar el payload.

> Reto genérico de práctica con un formulario de login estándar (usuario + contraseña) sobre una base de datos SQL.

## 1. Reconocimiento

Antes de tocar nada, conviene observar el comportamiento normal de la aplicación:

- Probar un usuario y contraseña incorrectos y anotar el mensaje de error exacto.
- Revisar si la web devuelve mensajes de error de base de datos (a veces aparecen en el código fuente o en la respuesta HTTP).
- Comprobar si el formulario usa `GET` o `POST` y qué parámetros envía (con las herramientas de desarrollador del navegador o con Burp Suite).

En este caso, el formulario envía dos campos por `POST`: `username` y `password`, y la respuesta cambia ligeramente según si el usuario existe o no. Esa diferencia es la primera pista de que la consulta a la base de datos podría estar mal construida.

## 2. Hipótesis: consulta sin parametrizar

Una consulta de login vulnerable suele tener esta forma (simplificada):

```sql
SELECT * FROM usuarios
WHERE username = '$username' AND password = '$password';
```

Si `$username` y `$password` se insertan directamente en la consulta sin sanear, podemos alterar la lógica de la sentencia SQL desde el propio formulario.

## 3. Probar el payload clásico

El payload más conocido para este tipo de caso es:

```text
usuario: admin' OR '1'='1' -- 
contraseña: cualquier_cosa
```

Al sustituirlo, la consulta que se ejecuta en el servidor queda así:

```sql
SELECT * FROM usuarios
WHERE username = 'admin' OR '1'='1' -- ' AND password = 'cualquier_cosa';
```

Dos detalles importantes:

- `OR '1'='1'` es una condición que **siempre es verdadera**, así que la cláusula `WHERE` completa se evalúa como verdadera para la primera fila de la tabla, da igual lo que haya en `username` o `password`.
- `--` (con un espacio detrás) es un comentario en SQL, así que todo lo que viene después —incluida la comprobación de la contraseña— se ignora.

Con eso, la base de datos devuelve una fila válida y la aplicación interpreta que el login ha sido correcto.

## 4. Confirmación con Burp Suite

Para verificarlo de forma controlada:

1. Capturamos la petición `POST` del login con Burp Suite (pestaña *Proxy* → *HTTP history*).
2. La enviamos a *Repeater*.
3. Modificamos el campo `username` con el payload anterior y reenviamos la petición.
4. Comparamos la respuesta con la de un intento de login fallido: si cambia el código de estado, aparece una redirección a un panel autenticado, o se muestra contenido distinto, la inyección ha funcionado.

En este reto, la respuesta pasa de un `200 OK` con el formulario de login a una redirección `302` hacia `/panel`, lo que confirma el bypass.

## 5. Variantes útiles

No siempre el payload básico funciona igual; algunas variantes habituales según el motor o el contexto:

| Payload | Cuándo usarlo |
|---|---|
| `' OR 1=1 -- ` | Variante sin comillas alrededor de los números |
| `' OR '1'='1` | Cuando el comentario `--` no es soportado o se filtra |
| `admin'-- ` | Cuando solo interesa autenticarse *como* un usuario concreto (`admin`) |
| `' OR 1=1#` | MySQL, cuando `#` actúa como comentario en lugar de `--` |

## 6. Causa raíz y mitigación

La causa no es "no escapar comillas", sino **construir la consulta concatenando datos de entrada del usuario**. La forma correcta de resolverlo es usar **consultas parametrizadas (prepared statements)**, que separan el código SQL de los datos:

```python
cursor.execute(
    "SELECT * FROM usuarios WHERE username = %s AND password = %s",
    (username, password)
)
```

De esta forma, el motor de base de datos trata `username` y `password` siempre como datos, nunca como parte de la sentencia SQL, sin importar lo que contengan.

Medidas adicionales recomendadas:

- Aplicar el **principio de mínimo privilegio** al usuario de base de datos que usa la aplicación.
- Registrar y monitorizar intentos de login con patrones anómalos (comillas, comentarios SQL, etc.).
- Usar un **WAF** como capa adicional, nunca como única defensa.

## Conclusión

Este caso es un buen recordatorio de que entender *por qué* funciona un payload es mucho más valioso que memorizarlo. La inyección SQL en formularios de login sigue apareciendo en aplicaciones reales, normalmente por código heredado o por mezclar capas de la aplicación sin separar datos y lógica.
