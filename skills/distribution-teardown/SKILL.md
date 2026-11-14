---
name: distribution-teardown
description: "Use when auditing how a product gets distribution."
version: 1.0.0
metadata:
  hermes:
    tags: [distribution, communities, reddit, research, ai-kingdom]
    related_skills: [ai-kingdom-niche-radar, first-customer-acquisition, reddit-reading, market-signal-interpretation]
---

# Teardown de distribución

Responder con evidencia "¿por dónde entra este producto al mercado?" y dejar la respuesta
consultable en el grafo y en el sitio, no en prosa. El radar de nichos dice dónde duele; el
teardown dice dónde se puede publicar, que es otra pregunta.

## Cuándo

- Hay producto y no hay tracción: hay que elegir canal sin adivinar.
- El operador pide "cómo distribuye X", "dónde publicamos", "auditá estas comunidades".
- Después de medir dolores: el léxico ya está, falta saber qué formato aguanta un producto.

## Vocabulario de veredicto (usarlo tal cual, sin sinónimos)

| veredicto | significa | acción |
| --- | --- | --- |
| `closed` | las reglas prohíben producto | no se postea; queda como lectura |
| `gated` | se permite pero con requisito (antigüedad de cuenta, karma) | arrancar el reloj hoy, no el día que se quiere postear |
| `mine` | el formato no aloja links (~0% link posts) | minar lenguaje, no publicar |
| `unknown` | no se leyeron las reglas | es una incógnita, no un canal abierto |
| `channel` | reglas y formato permiten | candidato real |

## Dos números deciden, no uno

- `fit` 0–100 del harness: reglas más formato.
- Porcentaje de posts del sub que llevan link externo. Si es ~0%, publicar ahí es remar contra
  el formato aunque las reglas callen. Un tablón de canjes con 96% de links es el único tipo de
  sub donde un producto no es cuerpo extraño.

Un `unknown` con 96% de links vale más que un `mine` con fit alto: lo que falta ahí es leer
reglas, no cambiar de canal. Ordenar la tabla por fit, no por tamaño del sub.

## Loop

1. Correr el teardown con las comunidades que importan, no con todas (ver
   `references/red-harness.md` para los comandos).
2. Leer la tabla de veredictos y el plan determinista que devuelve.
3. Para cada `unknown`: conseguir las reglas y volver a correr pasándolas como archivo. Reddit
   no sirve `about/rules` a IPs de datacenter, por eso el harness acepta el archivo pegado.
4. Cada veredicto se convierte en nodo de política con arista `HAS_POLICY` citando la corrida, y
   en columnas del sitio (fit, veredicto, % links). Sin fuente no entra.
5. El plan entra como pasos numerados en la vista de decisiones. Si viene en inglés, se traduce
   y se corrige la prosa sin tocar el orden ni los umbrales, y se anota que está adaptado.

## Cuando el veredicto propio y el del harness no coinciden

El veredicto propio sale de densidad de dolor; el del harness, de reglas y formato. No son
rivales: densidad dice dónde duele, `% links` dice dónde se puede publicar. Mostrar los dos en
la misma tabla, comunidad por comunidad, y explicar la diferencia en vez de elegir uno.

Si el veredicto propio premia densidad sin pesar volumen, miente: 40% de señal sobre 3 posts
diarios no sostiene un calendario. `fuerte` tiene que exigir densidad **y** ritmo (densidad
≥25% y ≥8 posts/día). Densidad sin ritmo es una muestra chica, no una mina.

## Reglas

- El teardown mide y decide canal; no escribe copy ni propone producto.
- Un sub con reglas sin leer no se declara ni abierto ni cerrado: se escribe `unknown`.
- Un sub que exige cuenta vieja es un reloj, no una puerta cerrada: si el canal importa, la
  cuenta se empieza a calentar antes de necesitarla.
- Nada de publicar en un sub cuya política no esté leída y citada.

## Pitfalls

- Si la auditoría de comunidades vuelve vacía en menos de un segundo, no es que falten datos:
  un filtro por `target.url` está salteando todas las áreas, y una ficha de App Store sin web
  propia no tiene url. Las comunidades no necesitan web, solo la lista de subs. Verificar el
  filtro antes de creer el resultado.
- El harness corta en 12 comunidades por corrida: elegir por valor de decisión (cierre de
  reglas y verticales principales) y dejar escrito cuáles quedaron afuera.
- Tableros de canjes y promo contaminan cualquier conteo de dolor: sus títulos traen precios y
  hardware ("$39.99 -> Free", "cámara") y disparan patrones de plata y de cámara sin dolor
  detrás. Excluirlos del conteo con lista explícita e impresa en el output, y medirlos aparte
  como canal, que es lo que son.
- Reddit: 60 s entre requests, sin excepción. Si el harness ya espera, no sumar otro throttle.
- Texto en castellano generado por script sale sin tildes: pasada por palabra completa contra un
  diccionario respetando la mayúscula inicial (una clave en minúscula no agarra `Medición` al
  principio de un título). Revisar el output renderizado, no el fuente.
