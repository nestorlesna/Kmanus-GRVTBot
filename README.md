# GRVT Grid

Bot de trading de grilla multiusuario para el exchange de futuros
perpetuos [GRVT](https://grvt.io). Autoalojable, con licencia AGPL, con un
dashboard web en tiempo real, alertas de Telegram y credenciales de API
cifradas por usuario.

También hay una instancia alojada en **[grvtbot.com](https://grvtbot.com)**
— ejecuta exactamente el código de este repositorio. No tienes que alojar
tu propia copia para usarlo.

## Cómo usarlo

**Opción 1 — Usa la instancia alojada** en
[grvtbot.com](https://grvtbot.com). Crea una cuenta, pega tus
credenciales de API de GRVT (cifradas en reposo con AES-256-GCM),
configura una grilla y el bot operará en tu subcuenta 24/7. El operador
no toca tus fondos. Consulta [SECURITY.md](SECURITY.md) para el modelo de
amenazas exacto — en resumen: el operador técnicamente puede descifrar
tus credenciales porque la clave maestra reside en el mismo servidor. Si
quieres que ningún tercero tenga acceso a tus claves, usa la Opción 2.

**Opción 2 — Aloja tu propia copia**. Consulta
[docs/INSTALL.md](docs/INSTALL.md) para la configuración completa. Versión
rápida:

```bash
git clone https://github.com/kmanus88/GRVTBot.git
cd GRVTBot
npm install
npm run build

# genera la clave maestra de cifrado (32 bytes aleatorios, archivo 0600)
sudo mkdir -p /etc/grvt-grid
sudo sh -c 'head -c 32 /dev/urandom > /etc/grvt-grid/master.key'
sudo chmod 600 /etc/grvt-grid/master.key

# copia + completa el env de ejemplo (tú aportas tus propias credenciales de
# API de GRVT, SMTP, JWT_SECRET, etc. — consulta packages/bot/.env.example
# para cada campo)
cp packages/bot/.env.example packages/bot/.env

# ejecuta el bot (en producción corre bajo systemd — ver docs/INSTALL.md)
node packages/bot/dist/dashboard/server.js
```

## Qué hace

- **Trading de grilla**: define un rango de precios y N niveles, coloca
  órdenes límite de compra/venta en cada nivel y repone las ejecuciones
  automáticamente. Soporta actualización de rango, capitalización
  compuesta, stop-loss / take-profit, pausas de seguridad, auto-shift y
  backtesting.
- **Grilla virtual por bot**: configura un rango más amplio que el que
  cabe en el límite de GRVT de 80 órdenes por instrumento; el bot
  mantiene una ventana activa de órdenes alrededor del precio actual y se
  desplaza a medida que el precio se mueve.
- **Multiusuario, multibot**: cada usuario se registra con sus propias
  credenciales de GRVT y ejecuta sus propios bots de forma aislada. No
  hay fuga de datos entre inquilinos (tenants).
- **Dashboard en tiempo real**: curva de equity, estadísticas por bot,
  ejecuciones, posición, PnL, alertas. Impulsado por WebSocket, así que
  las actualizaciones aparecen sin recargar.
- **Alertas de Telegram** (opcional): ejecuciones agrupadas, avisos de
  drawdown, avisos de proximidad a liquidación, resumen diario.

## Arquitectura

```
packages/
  bot/        Motor + API REST + servidor WebSocket (Node, TypeScript)
  dashboard/  Frontend SPA (Vite + React + Tailwind + Recharts)
  notifier/   Worker independiente de alertas de Telegram
scripts/      Utilidades de backup + administración
docs/         Instalación, rollback, notas operativas
```

El proceso del bot mantiene la conexión WebSocket con GRVT, ejecuta el
motor de grilla y sirve la API REST/WS. El dashboard es una SPA estática
que el bot sirve junto con la API. El notifier es un proceso separado
opcional que lee la BD del bot (solo lectura) y envía las alertas.

Los datos viven en SQLite en `data/grid_bot.db` (un único archivo). Las
contraseñas de los usuarios se almacenan como hash bcrypt; las
credenciales de GRVT se cifran con AES-256-GCM usando una clave en disco.
Consulta [SECURITY.md](SECURITY.md).

## Estado

En producción. La instancia alojada en
[grvtbot.com](https://grvtbot.com) lleva meses ejecutando operaciones
reales. Issues y PRs son bienvenidos.

## Cómo contribuir

Ejecuta `npm test` desde la raíz — actualmente 208 tests entre los
paquetes bot, dashboard y notifier. Los PRs que añadan funcionalidades
deben incluir tests; los PRs que corrijan bugs deben incluir un test de
regresión.

## Licencia

[AGPL-3.0-or-later](LICENSE). En resumen: eres libre de usar, modificar y
autoalojar este código. **Si lo modificas Y lo ejecutas como un servicio
de red, debes publicar tus modificaciones bajo la misma licencia.** Esto
es para mantener los forks y las instancias alojadas competidoras en
código abierto.

## Seguridad

Reportes de vulnerabilidades: **no** abras un issue público en GitHub.
Consulta [SECURITY.md](SECURITY.md) para el proceso de reporte y el
modelo de amenazas completo.
