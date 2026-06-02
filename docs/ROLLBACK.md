# Despliegue y Rollback

## Procedimiento de despliegue

```bash
# 1. Construir localmente
npm run build --workspace=@grvt-grid/bot
npm run build --workspace=@grvt-grid/dashboard

# 2. Crear el tarball
tar czf deploy.tar.gz packages/bot/dist/ packages/bot/src/ packages/dashboard/dist/

# 3. Subir al VPS
scp deploy.tar.gz root@YOUR_VPS:/tmp/

# 4. En el VPS: respaldar el actual → extraer el nuevo → reiniciar
ssh root@YOUR_VPS
cd /opt/grvt-grid-bot
cp -r dist/ .rollback-dist-$(date +%s)
cp -r src/ .rollback-src-$(date +%s)
systemctl stop grvt-grid-bot
tar xzf /tmp/deploy.tar.gz --strip-components=2 -C . packages/bot/dist packages/bot/src
chown -R grvtbot:grvtbot dist/ src/
systemctl start grvt-grid-bot
systemctl is-active grvt-grid-bot
```

## Procedimiento de rollback

Si un despliegue rompe el bot:

```bash
ssh root@YOUR_VPS
cd /opt/grvt-grid-bot

# Encontrar el backup más reciente
ls -lt .rollback-dist-* | head -1
# Ejemplo: .rollback-dist-1776012341

# Restaurar
systemctl stop grvt-grid-bot
rm -rf dist/ src/
cp -r .rollback-dist-1776012341 dist/
cp -r .rollback-src-1776012341 src/
chown -R grvtbot:grvtbot dist/ src/
systemctl start grvt-grid-bot
```

## Verificar después del despliegue

```bash
# Comprobar el servicio
systemctl is-active grvt-grid-bot

# Comprobar los logs (últimas 20 líneas)
tail -20 /var/log/grvt-grid-bot/server.log

# Comprobar la salud
curl -s http://localhost:3848/api/v2/metrics | head -5

# Comprobar que el bot 44 está en ejecución
curl -s -H "X-Api-Key: YOUR_KEY" http://localhost:3848/api/v2/bots | python3 -m json.tool | grep status
```

## Backup de la base de datos antes de despliegues arriesgados

Respalda siempre la BD antes de desplegar cambios de esquema:

```bash
sqlite3 /opt/grvt-grid-bot/data/grid_bot.db ".backup /var/backups/grvt-grid-bot/pre-deploy-$(date +%s).db"
```
