# Comportamiento ante pérdida de conexión

Qué le pasa a tu bot cuando la API de GRVT se vuelve inalcanzable.

## Corte breve (<5 minutos)

- **Las órdenes abiertas permanecen en GRVT.** El exchange las mantiene del lado del servidor — no dependen de que tu bot esté conectado.
- **Los errores del bucle del monitor se capturan.** Cada tick de 5s que falla al alcanzar GRVT registra un error y reintenta en el siguiente tick. El bot NO pausa ni cancela órdenes.
- **La detección de ejecuciones se pausa.** Las nuevas ejecuciones no se detectarán hasta que vuelva la conectividad. NO se pierden — la siguiente llamada exitosa a `getFillHistory` recupera todo lo ocurrido desde el último sondeo.
- **El sondeo de funding se pausa.** Igual — se pone al día al reconectar.
- **El dashboard muestra datos obsoletos.** El endpoint de salud reporta `status: degraded` (la comprobación de GRVT falla, la de la BD pasa).

## Corte prolongado (5+ minutos)

- **Igual que arriba, pero más tiempo.** El bot sigue reintentando cada 5s indefinidamente.
- **Sin pausa automática.** El bot NO se autopausa durante un corte de GRVT. Tus órdenes siguen activas en el exchange. Esto es intencional: pausar cancelaría todas las órdenes, lo cual es peor que esperar la reconexión.
- **El rebalanceo de capitalización compuesta se omite.** La comprobación horaria de capitalización falla silenciosamente y reintenta a la hora siguiente.
- **El notifier se degrada.** Las alertas de Telegram pueden fallar (es independiente de GRVT, pero si el propio VPS está caído, todo se detiene).

## Qué NO ocurre

- ❌ Las órdenes NO se cancelan durante un corte.
- ❌ El bot NO cierra tu posición.
- ❌ No se pierden datos — las ejecuciones, el funding y los roundtrips se ponen al día al reconectar.
- ❌ La salvaguarda (C.4) NO se dispara por pérdida de conexión — solo se dispara por la proximidad del precio a la liquidación, lo que requiere una lectura exitosa del ticker.

## Caída / reinicio del proceso

- **SIGTERM (reinicio de systemd):** Apagado ordenado — drena las tareas en curso, preserva las órdenes en GRVT, cierra la BD limpiamente. Las órdenes sobreviven al reinicio.
- **SIGINT (Ctrl+C):** Cancela todas las órdenes, pausa los bots, cierra la BD. Úsalo solo en desarrollo.
- **Kill -9 / OOM:** No ordenado — las órdenes permanecen en GRVT (están del lado del servidor), pero la BD puede necesitar recuperación del WAL en el siguiente arranque (SQLite lo maneja automáticamente).

## Recomendaciones

1. **No entres en pánico durante los cortes.** Tus órdenes están a salvo en GRVT.
2. **Comprueba el endpoint de salud** (`/api/v2/health`) para ver si es un problema de GRVT o un problema local.
3. **Configura el notifier** con Telegram — te alertará ante cambios de estado y eventos de drawdown.
4. **Habilita los backups automatizados** (`scripts/backup.sh` vía cron) para que una pérdida catastrófica de la BD no signifique la pérdida total de datos.
