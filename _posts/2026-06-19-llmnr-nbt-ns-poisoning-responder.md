---
title: "LLMNR/NBT-NS Poisoning: cómo un error de tipeo regala un hash NTLMv2"
date: 2026-06-19
category: red-team
category_label: Red Team
ref: "2026-005"
difficulty: 2
tags: [llmnr, nbt-ns, ntlmv2, responder, active-directory, credential-access]
excerpt: "Cómo dos protocolos de resolución de nombres heredados de Windows, activos por defecto en la mayoría de entornos corporativos, permiten a un atacante en la red local capturar hashes de credenciales sin explotar ninguna vulnerabilidad de software."
---

Hay ataques que no necesitan explotar un fallo del software. LLMNR/NBT-NS Poisoning es uno de ellos: aprovecha el comportamiento por defecto de Windows para, con nada más que estar presente en la misma red local que la víctima, capturar sus credenciales en forma de hash NTLMv2. MITRE ATT&CK lo cataloga como T1557.001 (Adversary-in-the-Middle: LLMNR/NBT-NS Poisoning and SMB Relay), dentro de las tácticas de Credential Access y Collection.

Es también una de las técnicas con mayor tasa de éxito en ejercicios de pentesting interno, precisamente porque los protocolos que la hacen posible siguen activos por defecto en la mayoría de entornos Windows, y desactivarlos requiere cambios explícitos de Group Policy que muchas organizaciones nunca han aplicado.

## 1. Qué son LLMNR y NBT-NS

Cuando un equipo Windows quiere resolver un nombre de host (traducir un nombre como `\\fileserver` a una dirección IP), sigue una cadena de intentos ordenados:

1. Busca en su caché DNS local.
2. Consulta el archivo `hosts`.
3. Pregunta al servidor DNS configurado.
4. Si DNS no puede responder — porque el nombre no existe, está mal escrito, o el servidor no está disponible — cae en un último recurso: **pregunta a todos los dispositivos de la red local** usando protocolos de difusión.

Esos protocolos de difusión son LLMNR y NBT-NS.

**LLMNR** (Link-Local Multicast Name Resolution) es el más moderno de los dos. Cuando DNS falla, el equipo emite una pregunta en multicast a la dirección `224.0.0.252` (IPv4) por el puerto UDP 5355: *"¿Alguien en esta red sabe dónde está `fileserver`?"*. Cualquier equipo de la subred que escuche puede responder.

**NBT-NS** (NetBIOS Name Service) es el predecesor, heredado de cuando NetBIOS era la base de las redes Windows. Opera por UDP 137. Si LLMNR falla o está desactivado, Windows cae aquí como siguiente intento.

El problema de ambos protocolos es el mismo: **no verifican quién responde**. Cualquier dispositivo de la subred puede contestar a una consulta LLMNR o NBT-NS, y el equipo que pregunta confiará en la respuesta sin ninguna comprobación de autenticidad.

## 2. El flujo del ataque

El escenario más habitual parte de un error de tipeo, aunque no es el único desencadenante posible:

1. Un usuario intenta acceder a `\\fileservr` (en vez de `\\fileserver`). El nombre mal escrito no existe en DNS.
2. Windows, al no obtener respuesta del servidor DNS, emite una consulta LLMNR en multicast: *"¿Quién es `fileservr`?"*
3. El atacante, que tiene una herramienta como **Responder** escuchando en la red, intercepta esa consulta y responde primero: *"Soy yo, conecta a mi IP."*
4. El equipo de la víctima confía en la respuesta y trata de autenticarse contra el "servidor" del atacante, enviando su nombre de usuario y su **hash NTLMv2**.
5. Responder captura ese hash. Se envía un error de autenticación a la víctima para cerrar la sesión.

El atacante tiene ahora el hash NTLMv2. Desde ahí, tiene dos caminos:

- **Crackeo offline**: usar herramientas como Hashcat o John the Ripper contra el hash para recuperar la contraseña en texto claro, especialmente si es una contraseña débil o común.
- **SMB Relay**: en lugar de crackear, retransmitir el hash directamente a otro sistema de la red para autenticarse con él sin necesidad de conocer la contraseña — siempre que SMB Signing esté deshabilitado o no sea requerido en el destino.

## 3. Responder: la herramienta detrás del ataque

Responder es una herramienta de código abierto diseñada específicamente para explotar LLMNR, NBT-NS y mDNS. Está escrita en Python y forma parte del arsenal estándar de cualquier pentest interno. Su funcionamiento básico consiste en escuchar los broadcasts de resolución de nombres en la red local y responder a ellos haciéndose pasar por el recurso solicitado.

Al lanzarlo sobre una interfaz de red, Responder pasa a capturar automáticamente cualquier consulta LLMNR o NBT-NS que llegue a la subred, responde afirmando ser el host buscado, y registra las credenciales que los equipos víctima envían al intentar autenticarse.

El resultado es un archivo de log con hashes NTLMv2 listos para ser crackeados o retransmitidos.

## 4. Por qué sigue siendo tan efectivo

A pesar de ser una técnica conocida desde hace más de una década, LLMNR/NBT-NS Poisoning sigue siendo una de las primeras cosas que cualquier auditor comprueba en un pentest interno, y con frecuencia da resultados. Los motivos:

**LLMNR y NBT-NS están activos por defecto.** En cualquier instalación estándar de Windows, ambos protocolos están habilitados sin necesidad de configuración adicional. Desactivarlos requiere aplicar políticas de Group Policy explícitas, algo que muchas organizaciones simplemente no han hecho.

**Los errores de tipeo son inevitables.** No hace falta un escenario elaborado: basta con que algún usuario de la red escriba mal el nombre de un recurso compartido, lo cual ocurre en entornos reales con regularidad.

**No explota ninguna vulnerabilidad.** Desde el punto de vista del sistema operativo, todo funciona según el diseño. Esto significa que no hay parche que aplicar para eliminarlo: la solución es de configuración, no de software.

**Los hashes NTLMv2 son crackeables.** Especialmente cuando las contraseñas no cumplen una política de complejidad estricta. En entornos reales con contraseñas débiles, el tiempo de crackeo puede medirse en segundos o minutos con hardware moderno.

## 5. Cómo detectarlo y mitigarlo

La buena noticia es que la mitigación es directa, aunque requiere disciplina operacional para aplicarla correctamente.

**Desactivar LLMNR mediante Group Policy** es el primer paso. La clave está en `Computer Configuration > Administrative Templates > Network > DNS Client > Turn off multicast name resolution`. Desactivar solo LLMNR sin deshabilitar también NBT-NS es insuficiente: Windows caerá automaticamente en NBT-NS si LLMNR no está disponible.

**Desactivar NBT-NS** se hace a través de las propiedades avanzadas de TCP/IP de cada adaptador de red, o de forma centralizada mediante script o Group Policy. Ambos deben desactivarse conjuntamente para eliminar el vector.

**Habilitar SMB Signing** en todos los equipos de la red elimina la variante más peligrosa del ataque (SMB Relay), obligando a que las comunicaciones SMB estén firmadas criptográficamente y no puedan ser retransmitidas por un tercero.

**Monitorización**: las herramientas SIEM pueden detectar patrones de consultas LLMNR/NBT-NS anómalas, especialmente si un mismo host responde a múltiples consultas de resolución de nombres en un corto período de tiempo, lo cual no corresponde al comportamiento normal de un equipo legítimo.

| Medida | Qué elimina |
|---|---|
| Desactivar LLMNR por GPO | El vector principal de captura |
| Desactivar NBT-NS por TCP/IP | El fallback al protocolo heredado |
| SMB Signing obligatorio | La variante de relay (sin crackeo) |
| Segmentación de red / VLANs | Limita el alcance del broadcast |
| Contraseñas complejas y largas | Aumenta el coste de crackeo offline |

## Conclusión

LLMNR/NBT-NS Poisoning es un buen ejemplo de por qué la superficie de ataque de un entorno corporativo no está solo en las vulnerabilidades de software: está también en protocolos que llevan décadas activos por defecto, diseñados en una época en que la seguridad de red no era una prioridad. Un atacante con acceso a la red local, las herramientas adecuadas, y paciencia para esperar a que alguien cometa un error de tipeo puede conseguir credenciales válidas sin explotar ningún CVE. La mitigación existe, es conocida y es relativamente sencilla de aplicar. La brecha entre "conocido" y "aplicado" es, en muchos entornos, lo que hace que este ataque siga apareciendo en los informes de pentesting año tras año.

*Fuentes: Resecurity – "From Broadcast to Breach" (oct. 2025), MITRE ATT&CK T1557.001, TCM Security, Stern Security.*
