# GRVT Grid — Hoja de ruta

> **Última actualización**: 2026-04-25
> **Estado actual**: Fases A-H completadas. Bots en producción (grillas ETH 10x + SOL virtual 10x). Fase I (Lumina) en pausa.

---

## Completado

### Fase A — Motor de grilla ✅
Motor principal de trading de grilla sobre futuros perpetuos de GRVT. Estrategias LONG/SHORT, órdenes post-only con reintento, deduplicación de ejecuciones, manejo de rate-limit.

### Fase B — Dashboard + Multiinquilino ✅
SPA completa (Vite + React + Tailwind + shadcn). GridChart con superposiciones de velas + grilla, curva de equity, sparklines, asistente de creación de bot en 4 pasos, actualización de rango en vivo con vista previa, rebalanceo de capitalización compuesta, seguimiento de roundtrips mediante emparejamiento FIFO de ejecuciones, autenticación multiinquilino (JWT + credenciales cifradas), kit de autoalojamiento con Docker, notifier de Telegram, tema claro/oscuro.

### Fase C — Endurecimiento y fiabilidad ✅
Los 10/10 desplegados. Logging estructurado (pino), clientes de GRVT por usuario, salvaguarda de liquidación, apagado ordenado, health check profundo, paginación, poda de processedFills, protección de un-bot-por-instrumento, salud del notifier.

### Fase D — Suite de tests (parcial)
- D.2 + D.3 desplegados (58 tests que cubren la API REST + cálculo de grilla).
- D.1, D.4-D.9 aún pendientes (ver más abajo).

### Fase E — Pulido del dashboard ✅
E.1-E.9 hechos. E.9 (recuperación de contraseña) incluye reset basado en SMTP con configuración opcional — si las variables de entorno de SMTP están vacías, la URL de reset se registra a nivel WARN para entrega fuera de banda, así el autoalojamiento sin SMTP sigue funcionando.

### Fase F — Notificaciones y alertas ✅ (5/6)
F.1-F.4 + F.6 desplegados: umbrales por bot, proximidad de liquidación, sink de webhook, horas silenciadas, historial de alertas. **F.5 (email) omitido — Telegram es suficiente para los usuarios actuales**.

### Fase G — Operaciones y monitoreo ✅
Los 6/6 desplegados: métricas de Prometheus, plantilla de Grafana, backups automatizados, documentación de rollback, rotación de logs, documentación de pérdida de conexión.

### Fase H — Trading avanzado ✅
- **H.2 — Grilla dinámica (auto-shift)**: opt-in por bot. Cuando el precio mark sale del rango en >= `auto_shift_pct` del ancho del rango, el monitor establece `autoShiftRequested`; el manejador del motor recentra el rango sobre el precio actual (mismo ancho) reutilizando `updateBotRange()`. Limitado a una vez por hora mediante `last_auto_shift_at` persistido. Emite el evento `autoShifted` → notificación WS. El dashboard muestra una tarjeta de estado en el detalle del bot cuando está habilitado.
- **H.3 — Stop-loss / take-profit**: opt-in por bot vía `sl_pct`/`tp_pct` (% de `investment_usdt`). El motor lanza `SAFEGUARD:pause_close` al cruzarse; `monitorAllBots` lo captura y lo enruta a `closeBot`. El dashboard expone una tarjeta editable en el detalle del bot (PATCH `/bots/:id/risk`) — vaciar el campo desactiva la salvaguarda. Corrección de bug crítico desplegada: el catch previo de `updatePnL` se tragaba silenciosamente el throw de SAFEGUARD, así que el SL/TP nunca se disparaba.
- **H.8 — Grillas virtuales**: el usuario puede configurar hasta 500 niveles de grilla; el motor mantiene una "ventana activa" de los N niveles más cercanos al precio (por defecto 70, máx 80 = el límite de GRVT menos margen) con el resto como `state='virtual'`. La ventana rota a medida que el precio se mueve: los niveles más cercanos se activan, los más lejanos se cancelan y degradan. La compra inicial cuenta TODOS los niveles de venta (incl. virtuales) para que el respaldo sea correcto desde el día uno. Esquema: `grid_bots.virtual_enabled`, `grid_bots.active_window_size`, `grid_levels.state`.
- Dashboard: los niveles virtuales se renderizan como líneas punteadas atenuadas en el gráfico, la franja de estadísticas muestra `N active · M virtual · K filled`, entrada "VIRTUAL" en la leyenda del gráfico.

### Auditoría de beneficios + unificación ✅ (2026-04-14)
Se añadió `paired_roundtrips.bot_id` con backfill; única fuente de verdad para el beneficio de la grilla (`SUM(profit) - SUM(fees)`); se corrigió la contaminación entre bots.

### Correcciones críticas (2026-04-25)
- **Bug de tolerancia de cobertura de grilla**: la tolerancia de coincidencia del monitor estaba hardcodeada a `< 0.5` USD. Con un paso de grilla de $0.25 en el bot de SOL, una sola orden de GRVT se asociaba (aliasing) a dos niveles adyacentes de la BD → el perdedor se reponía → duplicados. Corregido: `matchTolerance = min(0.05, gridStep / 3)` por bot.
- **Endurecimiento del eliminador de duplicados**: el umbral se ajustó de `active_window_size` a la `expectedActiveLevels.length` real. Se añadió detección de huérfanos que cancela órdenes de GRVT cuyo precio no coincide con ningún nivel esperado de la BD.
- **Detección de ejecuciones**: el monitor ahora comprueba tanto `getFillHistory` por REST COMO el `fills_archive` local respaldado por WS antes del salto de 10s por el lag de GRVT — captura ejecuciones de velas agresivas dentro de la ventana de salto.
- **Condiciones de carrera en el arranque**: flags `bootstrapInProgress` + `bootstrapAbort`, marcado de niveles de hueco (gap) al abrir, eliminación de colocación redundante de SELL.
- **Acceso al servidor**: la raíz `/` redirige a `/dashboard/`, se omite basic auth para las rutas de la SPA (la app v2 tiene su propio login JWT).

---

## Pendiente

### Fase D (restante)
| # | Tarea | Alcance | Est. |
|---|------|-------|-----|
| D.1 | Test de integración del ciclo de vida del bot | `tests/integration/` | 2h |
| D.4 | Tests de rebalanceo de capitalización compuesta | `tests/grid-engine.test.ts` | 1h |
| D.5 | Tests de actualización de rango | `tests/range-update.test.ts` | 2h |
| D.6 | Tests de migración de BD | `tests/db.test.ts` | 1h |
| D.7 | Tests del notifier | `packages/notifier/tests/` | 1h |
| D.8 | Tests de componentes del dashboard | `packages/dashboard/tests/` | 2h |
| D.9 | Tests de WebSocket | `tests/ws.test.ts` | 1h |

### Fase H (nueva generación, todo nuevo)
| # | Tarea | Por qué | Est. |
|---|------|-----|-----|
| H.5 | **Multi-subcuenta** — conectar múltiples subcuentas de GRVT, ejecutar bots en cada una | Aislamiento entre estrategias para usuarios avanzados | 3h |
| H.6 | **Backtesting** — simular la grilla sobre velas históricas | Probar parámetros antes de arriesgar capital | 8h |
| H.7 | **Vista de cartera** — equity / PnL / riesgo agregados entre todos los bots | El resumen carece de estadísticas agregadas | 3h |

### Fase I — Integración de seguro Lumina (en pausa)
Existe un plan en `~/.claude/plans/effervescent-sparking-lamport.md`. Diferido hasta que las bóvedas de Lumina tengan un TVL distinto de cero y/o exista un producto específico para GRVT. La economía del Flash Insurance aún no cierra para bots de poco capital a bajo apalancamiento.

---

## Orden de prioridad (próximo recomendado)

```
1. H.5 — Multi-subcuenta          (~3h, esquema listo)
2. H.7 — Vista de cartera         (~3h, mejora la UX del resumen)
3. Restantes de D                 (~10h, cobertura de tests)
4. H.6 — Backtesting              (~8h, funcionalidad grande)
```

La Fase I (Lumina) espera la madurez del protocolo. Sin trabajo programado.

---

## Estado de producción (25 abr)

- **Bot 44**: ETH_USDT_Perp · LONG · 10x · 94 grillas · realizado $53+ · en ejecución
- **Bot 48**: SOL_USDT_Perp · LONG · 10x · 120 grillas virtuales (ventana 70) · $100 invertidos · en ejecución
- **Hosting**: VPS autogestionado detrás de un proxy inverso Caddy + TLS de Let's Encrypt
- **BD**: SQLite WAL almacenada bajo el directorio `data/` del paquete del bot (`$GRID_BOT_DB`)
- Servicios: unidades systemd `grvt-grid-bot.service` + `grvt-grid-notifier.service` ejecutándose como un usuario dedicado sin privilegios
