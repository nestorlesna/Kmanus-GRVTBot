# Política de Seguridad

Este documento es tanto para los usuarios de la instancia alojada en
[grvtbot.com](https://grvtbot.com) como para los desarrolladores que
autoalojan su propia copia.

## Qué hace este software con tus datos

Cuando creas una cuenta en una instancia de GRVT Grid y conectas tus
credenciales de API de GRVT, el bot almacena:

- Tu dirección de correo electrónico.
- Un hash **bcrypt** (factor de coste 12) de tu contraseña — el texto
  plano nunca se escribe en disco, nunca se registra en logs, nunca es
  recuperable. Incluso con acceso completo a la base de datos, un atacante
  tendría que hacer fuerza bruta sobre cada contraseña individualmente a
  ~10 hashes/seg/núcleo.
- Tu clave de API de GRVT, el secreto de API, la dirección de trading, el
  ID de cuenta y el ID de subcuenta, **cifrados en reposo con
  AES-256-GCM**. Cada fila tiene un IV aleatorio fresco de 12 bytes, y el
  tag de autenticación GCM se verifica en cada descifrado — la
  manipulación silenciosa se detecta y se aborta.

El cifrado usa una clave maestra de 32 bytes almacenada en disco en
`/etc/grvt-grid/master.key` (o `$MASTER_KEY_PATH`), propiedad del usuario
del proceso del bot con permisos de archivo `0600`.

## Contra qué protege el cifrado

- **Robo de la base de datos**: una copia robada de `grid_bot.db` es
  inútil sin `master.key`.
- **Fugas de backups**: lo mismo — los backups solo contienen texto
  cifrado en reposo.
- **Fisgoneo casual**: nadie puede hacer `sqlite3` sobre el archivo y leer
  tus credenciales en texto plano.
- **Manipulación de memoria**: el tag de autenticación GCM impide que un
  atacante invierta bits en el texto cifrado para falsificar un descifrado
  válido.

## Contra qué NO protege el cifrado

- **Un operador comprometido o malicioso.** El operador de cualquier
  instancia alojada tiene acceso root al servidor, lo que significa que
  tiene acceso de lectura a `master.key`, lo que significa que puede
  descifrar cualquier credencial almacenada en cualquier momento. **Este
  es un límite fundamental del hosting multiinquilino del lado del
  servidor**, no un defecto de la implementación.
- **Coacción gubernamental o legal** contra el operador.
- **Compromiso root completo** del host.

Si no quieres que ningún tercero tenga acceso técnico a tus credenciales
de GRVT, **aloja tu propia instancia**. El bot tiene licencia AGPL-3.0
(ver [LICENSE](LICENSE)). La configuración es sencilla — consulta
[docs/INSTALL.md](docs/INSTALL.md).

## Resumen del modelo de amenazas

| Amenaza | Mitigada por | Riesgo residual |
|---|---|---|
| Robo de backup de la BD | AES-256-GCM en reposo | Ninguno si la clave maestra no se roba también |
| Adivinación de contraseñas por fuerza bruta | bcrypt coste 12 | Lento pero no infinito |
| Fuerza bruta sobre la API de login | `express-rate-limit` (5/15min por IP) | Solo ataques distribuidos masivos |
| Credential stuffing de contraseñas filtradas | El mismo rate limit | Igual |
| Inyección SQL | Consultas parametrizadas en todo el código | Ninguno conocido |
| XSS en el dashboard | Escapado por defecto de React + CSP de helmet | Solo a nivel de auditoría |
| Clickjacking | `X-Frame-Options: SAMEORIGIN` + COOP | Ninguno |
| Spoofing de Host-header / enlace de reset | `APP_BASE_URL` obligatorio, sin fallback al Host | Ninguno |
| Fuga de datos entre inquilinos (alertas, WS) | Filtro por usuario en el router + control de propiedad en WS | Ninguno conocido |
| Operador leyendo credenciales de usuarios | **NO mitigado** por diseño | Mitiga autoalojando |
| Pérdida de la clave maestra | Ninguna — los backups son inútiles sin ella | El operador debe respaldar `master.key` offline |

## Autenticación y sesión

- Contraseñas: bcrypt coste 12, mínimo 8 caracteres (el bot rechaza las
  más cortas).
- Sesiones: JWT HS256 firmado con `JWT_SECRET` (se exige ≥32 caracteres),
  expiración de 24h, con issuer fijado y algoritmo fijado. Sin tokens de
  refresco — los usuarios vuelven a iniciar sesión tras 24h.
- Reset de contraseña: tokens con hash SHA-256 almacenados en la BD, TTL
  de 1h, de un solo uso; cualquier nueva solicitud invalida los tokens
  abiertos anteriores.
- El endpoint `/auth/forgot-password` es seguro frente a enumeración:
  devuelve el mismo `{"ok":true}` esté el correo registrado o no.

## Endurecimiento de red

- Todas las conexiones se sirven detrás de TLS vía Let's Encrypt
  (gestionado por un proxy inverso Caddy en el despliegue de referencia).
- Redirección HTTP→HTTPS, HSTS con `max-age` de 1 año y
  `includeSubdomains`.
- Cabeceras de seguridad vía `helmet`: `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, políticas
  Cross-Origin-Opener/Resource.
- El endpoint Prometheus `/api/v2/metrics` está protegido o bien por la
  cabecera `METRICS_TOKEN` o bien restringido a localhost — nunca
  expuesto a la internet pública.
- El propio bot solo escucha en `localhost:3848` en el despliegue de
  referencia; el proxy hace de puente hacia él.

## Cómo reportar una vulnerabilidad

Si encuentras un problema de seguridad, **no abras un issue público en
GitHub**.

Email: `security@grvtbot.com` (o, como alternativa, abre un aviso de
seguridad *privado* a través de la interfaz "Report a vulnerability" en la
pestaña Security del repositorio).

Nuestro objetivo es acusar recibo en un plazo de 48h. Si el problema es
crítico y afecta a la instancia alojada, primero parchearemos y
redesplegaremos, y luego publicaremos un postmortem una vez que los
usuarios estén a salvo.

## Fuera de alcance

- Problemas que requieran acceso físico al servidor.
- Problemas que requieran que el usuario instale extensiones de navegador
  maliciosas.
- DoS por saturación de la capa de aplicación (el proxy inverso maneja el
  DoS a nivel de red).
- Problemas en servicios de terceros (el propio GRVT, el proveedor de
  SMTP, el proveedor de hosting).

## Avisos divulgados

Divulgamos aquí las correcciones con impacto en seguridad después de que
la instancia alojada esté parcheada, para que quienes autoalojan puedan
decidir si su despliegue está afectado y aplicar la corrección. La
severidad refleja el impacto en el peor caso sobre la instancia alojada en
grvtbot.com; las instancias autoalojadas pueden enfrentar una exposición
distinta según su topología.

### 2026-05-28 — Clave de API del dashboard expuesta en el bundle del cliente (Crítica)

**Commit:** [`4631ba9`](https://github.com/kmanus88/GRVTBot/commit/4631ba9).
**Alcance:** instancia alojada afectada; quienes autoalojan están
afectados si mantuvieron la variable de entorno (ahora eliminada)
`VITE_DASHBOARD_API_KEY` en el entorno de build de su dashboard.

La variable `VITE_DASHBOARD_API_KEY` se incrustaba en el bundle de
JavaScript de producción y se servía públicamente bajo
`/dashboard/assets/*.js`. Cualquier navegador que visitara el sitio podía
extraer la clave del bundle y alcanzar todos los endpoints `/api/v2/*`
autenticado como la cuenta del operador (`user_id = 1`, admin), saltándose
el alcance por inquilino.

Las credenciales de GRVT cifradas permanecieron a salvo — ningún endpoint
devuelve secretos de API en texto plano — pero un atacante podía leer los
datos de los bots de cada usuario y disparar acciones del ciclo de vida de
los bots (iniciar / pausar / cerrar / actualizar-rango) contra la subcuenta
de GRVT del operador.

**Corrección:** se eliminó el fallback heredado `X-Api-Key` del dashboard.
La autenticación del navegador es ahora solo por JWT; el WebSocket también
pasó a `?token=<jwt>`. El servidor sigue aceptando `X-Api-Key` para
scripts del operador (curl, herramientas de administración) — ese lado no
cambia. La clave compartida en el VPS de producción se rotó in situ. El
valor comprometido nunca apareció en el historial de git.

Reportado por [@ijromeo](https://instagram.com/ijromeo) (DM de Instagram,
divulgación responsable). Gracias.

### 2026-05-28 — El cierre de bot puede dejar órdenes + posición abiertas en GRVT (Alta)

**Commit:** [`6331317`](https://github.com/kmanus88/GRVTBot/commit/6331317).
**Alcance:** todas las instancias; el impacto es financiero (desviación en
la propia cuenta de GRVT del usuario), no una ruptura del aislamiento entre
inquilinos.

`pauseBot()` y `closeBot()` en el motor de grilla cancelaban las órdenes
abiertas a través de la instancia del bot en memoria. Si esa instancia no
estaba presente (carrera al reiniciar el motor, bot previamente pausado, o
cualquier ruta que la eliminara antes de tiempo), la cancelación se omitía
silenciosamente y la BD igualmente se actualizaba a `paused` / `stopped`.
Las órdenes límite supervivientes seguían ejecutándose contra los
movimientos de precio, desviando la posición durante horas antes de que un
usuario lo notara.

`closeBot()` además colocaba una única orden límite GTC un 0.5% agresiva
para cerrar cualquier posición abierta y nunca verificaba la ejecución, así
que un movimiento rápido de precio podía dejar la posición parcial o
totalmente abierta con la BD ya marcada como `stopped`.

**Corrección:** ambas funciones ahora siempre cancelan a través del cliente
de GRVT del propietario contra el par (independientemente del mapa en
memoria), y el cierre de posición reintenta con slippage escalonado
(0.5% / 2% / 5%) hasta tres intentos, releyendo la posición en vivo cada
vez. Un barrido final de cancelar-todo limpia cualquier cola de órdenes de
cierre sin ejecutar.

Detectado mediante revisión de incidente en vivo el 2026-05-28 (sin
reportero externo). El residuo en producción se limpió antes de que se
desplegara el parche.
