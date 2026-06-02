# GRVT Grid — Guía de instalación para autoalojamiento

> **Público objetivo**: personas que quieren ejecutar su propio bot GRVT Grid
> en su propio servidor, con su propia cuenta de GRVT, con sus propias
> claves. **Sin SaaS.** Tus operaciones, tus claves, tu responsabilidad.

## Requisitos previos

| Requisito | Por qué |
|---|---|
| **Una cuenta de GRVT registrada mediante el enlace de referido del proyecto** | Necesaria para obtener acceso al repositorio y para mantener el proyecto sostenible. Pide el enlace al mantenedor. |
| **Un servidor Linux** (o Mac, o Windows con WSL2) con Docker Engine ≥ 24 y Docker Compose v2 | Todo el stack está en contenedores. No hace falta instalar Node en el host. |
| **2 GB de RAM** mínimo, 1 vCPU es suficiente | El bot ocupa ~110 MB, el dashboard es estático, el notifier es minúsculo. |
| **Una clave de API + secreto + id de subcuenta de GRVT** | Genéralos en grvt.io → Account → API Keys |
| **(Opcional) Un nombre de dominio apuntando a tu servidor** | Solo necesario si quieres HTTPS vía Caddy. Sin dominio, igual puedes acceder al dashboard localmente o por VPN. |
| **(Opcional) Un token de bot de Telegram + chat id** | Para notificaciones. Omítelo con valores vacíos si no las quieres. |

## Instalación rápida (5 minutos)

```bash
# 1. Clona el repo privado (necesitas acceso — contacta al mantenedor)
git clone https://github.com/<owner>/grvt-grid.git
cd grvt-grid

# 2. Ejecuta el instalador interactivo
./scripts/install.sh
```

El instalador hará lo siguiente:
1. Comprobar que Docker está instalado y en ejecución
2. Generar una `DASHBOARD_API_KEY` nueva
3. Pedirte las credenciales de GRVT (y de Telegram si quieres notificaciones)
4. Construir las imágenes de Docker
5. Arrancar el stack
6. Esperar a que pase el health check del bot
7. Imprimir la URL del dashboard y la clave de API

Cuando termine, abre la URL impresa, introduce la clave de API cuando el
dashboard te la pida, y tu bot aparecerá en el Resumen (Overview).

## Instalación manual (si quieres saltarte el instalador)

```bash
git clone https://github.com/<owner>/grvt-grid.git
cd grvt-grid

# 1. Crea .env a partir de la plantilla y completa tus credenciales
cp .env.example .env
chmod 600 .env
# Edita .env con tus claves de API de GRVT, etc.

# 2. Construye y arranca
docker compose build
docker compose up -d

# 3. Observa los logs hasta ver "✅ Active bots loaded"
docker compose logs -f bot

# 4. Abre el dashboard
open http://localhost:3848/dashboard/
```

## Perfiles de despliegue

`docker-compose.yml` define tres servicios opcionales controlados por
perfiles de Compose:

| Perfil | Incluye | Cuándo usarlo |
|---|---|---|
| _(por defecto)_ | solo bot | Desarrollo local, detrás de una VPN, o si harás proxy desde otro proxy inverso |
| `with-notifier` | bot + notifier | Quieres alertas de Telegram |
| `with-tls` | bot + caddy | Tienes un dominio público y quieres HTTPS |
| `full` | bot + notifier + caddy | Autoalojamiento en producción con todo |

Para arrancar con un perfil:

```bash
docker compose --profile full up -d
```

## Configuración de TLS (perfil with-tls)

1. Apunta un registro A desde tu dominio a la IP pública de tu servidor.
2. Edita `Caddyfile`: reemplaza `your-domain.example.com` por tu dominio.
3. Abre los puertos 80 y 443 en el firewall de tu servidor.
4. `docker compose --profile with-tls up -d`
5. Caddy obtendrá automáticamente un certificado de Let's Encrypt en ~30 segundos.
6. Abre `https://your-domain/dashboard/`.

## Detener de forma segura

El bot instala un manejador de SIGTERM que **no cancela ninguna orden
abierta en GRVT** cuando se detiene. Así que:

```bash
# Seguro — preserva las 93 (o las que sean) órdenes límite en GRVT
docker compose stop bot

# También seguro — lo mismo y luego elimina el contenedor
docker compose down

# También seguro (reinicio completo, mantiene las órdenes intactas)
docker compose restart bot
```

Lo que NO deberías hacer:

```bash
# NO — envía SIGKILL, sin apagado ordenado. Las órdenes siguen en GRVT
# (el bot no las cancela activamente al recibir la señal de todos modos),
# pero pierdes cualquier escritura en la BD en curso y el bot podría
# perderse las últimas ejecuciones en el siguiente arranque.
docker kill grvt-grid-bot
```

## Backups

La base de datos SQLite del bot vive en `./data/grid_bot.db` en el host.
Los archivos WAL (`*.db-wal`, `*.db-shm`) viven junto a ella. Respalda todo
el directorio `data/` cada noche en algún lugar fuera del host:

```bash
# Ejemplo: cron job que envía una instantánea diaria a S3 / Backblaze / etc.
0 3 * * * cd /opt/grvt-grid && tar czf - data | rclone rcat \
    remote:grvt-grid-backups/$(date +\%F).tar.gz
```

## Actualizar

```bash
cd /opt/grvt-grid
git pull
docker compose build
docker compose up -d   # reinicio progresivo, preserva el directorio data
```

Las migraciones de SQLite del bot se ejecutan automáticamente al arrancar.

## Resolución de problemas

### "Bot did not become healthy"

Revisa los logs:

```bash
docker compose logs -f bot
```

Causas comunes:
- **GRVT_API_KEY / SECRET incorrectos**: verás errores de autenticación en
  los logs. Vuelve a comprobar los valores en `.env`.
- **Cuenta de GRVT sin fondos**: el bot no empezará a operar con saldo cero,
  pero el health check debería pasar igual. Si no, revisa el id de tu
  subcuenta.
- **Puerto 3848 ya en uso**: cambia `BOT_PORT` en `.env`.

### El dashboard dice "GRVT session expired"

Tu clave de API fue rotada en grvt.io. Actualiza `GRVT_API_KEY` y
`GRVT_API_SECRET` en `.env`, luego `docker compose restart bot`.

### El notifier envía una avalancha de ejecuciones históricas al primer arranque

No debería ocurrir — el notifier adelanta su cursor en el arranque. Si
ocurre, detén el notifier y elimina su volumen de estado:

```bash
docker compose stop notifier
docker volume rm grvt-grid_notifier-state
docker compose start notifier
```

## Lista de verificación de seguridad

Antes de apuntar un dominio a esto y marcharte:

- [ ] Los permisos de `.env` son `600` (el instalador lo configura; verifícalo con `ls -la .env`)
- [ ] `DASHBOARD_API_KEY` tiene al menos 32 caracteres (el instalador genera 64)
- [ ] Estás usando el perfil `with-tls` (o tienes otro proxy HTTPS por delante)
- [ ] El firewall de tu servidor bloquea el puerto 3848 desde la internet
      pública (Caddy hace de proxy vía la red de docker — solo 80/443 deberían
      ser públicos)
- [ ] Has configurado backups nocturnos de `./data/`
- [ ] No estás ejecutando el dashboard heredado con basic auth (simplemente
      elimina `DASHBOARD_USER` / `DASHBOARD_PASS` de `.env` si no lo necesitas)
- [ ] Tu clave de API de GRVT tiene alcance solo a la subcuenta de trading —
      no a la cuenta maestra con permisos de retiro

## Dónde vive cada cosa

```
/opt/grvt-grid/
├── data/                         ← BD SQLite (bind mount)
│   ├── grid_bot.db
│   ├── grid_bot.db-wal
│   └── grid_bot.db-shm
├── logs/
│   ├── bot/                      ← stdout del bot
│   └── notifier/                 ← stdout del notifier
├── .env                          ← tus secretos
└── docker-compose.yml
```
