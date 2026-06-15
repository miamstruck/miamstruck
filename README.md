# MiamStruck — Bitácora de Ciberseguridad

Web personal de writeups técnicos (CTFs, análisis de vulnerabilidades, notas de seguridad), construida con [Jekyll](https://jekyllrb.com/) para publicarse gratis en **GitHub Pages**.

## 1. Poner la web online (una sola vez)

1. Crea una cuenta en [GitHub](https://github.com) si no tienes una.
2. Crea un repositorio nuevo. **Importante**: si quieres que la URL sea `https://tu-usuario.github.io`, el repositorio debe llamarse exactamente `tu-usuario.github.io`. Si lo llamas de otra forma (p. ej. `miamstruck-web`), la URL será `https://tu-usuario.github.io/miamstruck-web`.
3. Sube todos los archivos de esta carpeta al repositorio (puedes arrastrarlos desde la web de GitHub con "Add file → Upload files", o usando git).
4. En el repositorio, ve a **Settings → Pages**.
5. En "Build and deployment", selecciona **Source: Deploy from a branch**, rama `main` y carpeta `/ (root)`. Guarda.
6. Espera 1-2 minutos. Tu web estará en la URL que indica esa misma pantalla.

No necesitas instalar nada en tu ordenador para esto: GitHub construye la web automáticamente cada vez que subes (haces *push*) cambios.

### Antes de publicar, personaliza:

- `_config.yml`: cambia `title`, `description`, `author` y, si tu repo no es `tu-usuario.github.io`, pon en `baseurl` el nombre del repositorio (ej. `/miamstruck-web`) y en `url` tu dominio (ej. `https://tu-usuario.github.io`).
- `sobre-mi.md`: cambia el texto de contacto por tus enlaces reales (email, GitHub, X/Twitter, LinkedIn...).

## 2. Cómo añadir un nuevo writeup (workflow con Claude)

Esta web está pensada para que el flujo sea siempre el mismo:

1. **Tú**: le cuentas a Claude el reto/CTF/análisis que has resuelto (notas, capturas, pasos, lo que sea).
2. **Claude**: redacta el writeup completo, lo enseña para revisión, y cuando lo apruebas, genera el archivo `.md` listo para subir.
3. **Tú**: subes ese archivo a la carpeta `_posts/` del repositorio (arrastrándolo en GitHub o con git) y haces commit. La web se actualiza sola en 1-2 minutos.

### Formato del archivo

Cada writeup es un archivo Markdown dentro de `_posts/`, con el nombre:

```
AAAA-MM-DD-titulo-corto.md
```

Por ejemplo: `2026-07-03-escalada-privilegios-linux-suid.md`

Y debe empezar con esta cabecera (puedes usar `_drafts/plantilla-writeup.md` como plantilla):

```yaml
---
title: "Título del writeup"
date: 2026-07-03
category: pwn        # web | pwn | crypto | forensics | rev | misc
category_label: Pwn  # texto visible: Web, Pwn, Crypto, Forense, Reversing, Meta...
ref: "2026-003"        # número de caso: año + número secuencial
difficulty: 3          # 1 a 5 (se muestra como puntitos)
ctf: "Nombre de la plataforma"   # opcional
tags: [linux, suid, escalada-privilegios]
excerpt: "Resumen breve para el listado y para SEO."
---
```

Después de la cabecera, escribe el contenido en Markdown normal (títulos con `##`, bloques de código con \`\`\`, tablas, etc.).

### Categorías y colores

| `category` | Color en la web | Uso típico |
|---|---|---|
| `web` | Cian | Web, APIs, inyecciones, XSS... |
| `pwn` | Naranja | Explotación de binarios, buffer overflows... |
| `crypto` | Morado | Criptografía |
| `forensics` | Verde | Análisis forense, esteganografía |
| `rev` | Amarillo | Ingeniería inversa |
| `misc` | Gris | Meta, varios, herramientas |

## 3. Probar la web en tu ordenador (opcional)

Si tienes Ruby instalado:

```bash
bundle install
bundle exec jekyll serve
```

Y abre `http://localhost:4000` en el navegador. No es obligatorio: también puedes subir directamente a GitHub y revisar la web publicada.

## 4. Estructura del proyecto

```
_config.yml          # configuración del sitio
_layouts/             # plantillas (página general y plantilla de writeup)
_posts/               # tus writeups (uno por archivo)
_drafts/              # plantilla para nuevos writeups
assets/css/style.css  # estilos visuales
assets/js/terminal.js # animación del terminal de la portada
index.html            # portada (listado de writeups)
categorias.md         # página de categorías
sobre-mi.md           # página "sobre mí" / contacto
```
