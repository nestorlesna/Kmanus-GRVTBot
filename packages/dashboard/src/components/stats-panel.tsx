// Bot Detail stats panel — sidebar next to the equity curve.
// Sources: every number here comes from real GRVT fill data via
// /realized-summary (FIFO over fills_archive) and /rebate-summary
// (signed fee aggregation). Funding is from daily_snapshots.
// Legacy fields like bot.grid_profit_usdt and the paired_roundtrips
// table are intentionally NOT used — they were frozen since March.

import { useQuery } from '@tanstack/react-query';
import { Card } from './primitives/card';
import { Mono } from './primitives/mono';
import { api } from '@/lib/api-client';
import { formatPnl, formatUsd } from '@/lib/format';
import type { BotSummary } from '@/lib/api-types';

interface StatsPanelProps {
  bot: BotSummary;
}

export function StatsPanel({ bot }: StatsPanelProps) {
  const snapshots = useQuery({
    queryKey: ['snapshots', bot.id],
    queryFn: () => api.getSnapshots(bot.id),
    staleTime: 5 * 60_000,
  });

  // Real maker rebate summary, sourced from fills_archive (every fee is what
  // GRVT actually charged or refunded on this account — never estimated).
  const rebate = useQuery({
    queryKey: ['rebate-summary', bot.id],
    queryFn: () => api.getRebateSummary(bot.id),
    refetchInterval: 30_000,
  });

  // Real grid PnL via FIFO over fills_archive. Replaces the legacy
  // bot.grid_profit_usdt + paired_roundtrips combo (frozen since March).
  const realized = useQuery({
    queryKey: ['realized-summary', bot.id],
    queryFn: () => api.getRealizedSummary(bot.id),
    refetchInterval: 30_000,
  });

  const realizedPnl = realized.data?.realizedPnl ?? 0;  // gross, before fees
  const netPnl = realized.data?.netPnl ?? 0;            // net of fees
  const roundTrips = realized.data?.roundTrips ?? 0;
  const avgPerRT = realized.data?.avgPerRT ?? 0;

  // Days active: prefer the FIFO summary's first/last fill timestamps over
  // the snapshot count, since fills_archive is the source of truth.
  const firstFillNs = realized.data?.firstFillAt
    ? Number(realized.data.firstFillAt) / 1_000_000
    : null;
  const lastFillNs = realized.data?.lastFillAt
    ? Number(realized.data.lastFillAt) / 1_000_000
    : null;
  const days =
    firstFillNs && lastFillNs
      ? Math.max(1, Math.ceil((lastFillNs - firstFillNs) / 86_400_000))
      : (snapshots.data?.snapshots ?? []).length || 1;
  const avgPerDay = netPnl / days;

  // Funding still comes from daily_snapshots — that's a different data
  // source (funding payments aren't in fills_archive). Funding row only
  // shows when there's actual data.
  const snaps = snapshots.data?.snapshots ?? [];
  const totalFunding = snaps.reduce((sum, s) => sum + (s.funding_usdt ?? 0), 0);

  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Statistics</h3>
      <dl className="space-y-3">
        <Row
          label="Realized (net)"
          value={formatPnl(netPnl)}
          tone={netPnl > 0 ? 'success' : netPnl < 0 ? 'danger' : 'default'}
        />
        <Row label="Realized (gross)" value={formatPnl(realizedPnl)} />
        <Row label="Round trips" value={String(roundTrips)} />
        <Row label="Avg profit/RT" value={formatPnl(avgPerRT)} />
        <Row label="Days active" value={String(days)} />
        <Row
          label="Avg/day (net)"
          value={formatUsd(avgPerDay)}
          tone={avgPerDay > 0 ? 'success' : avgPerDay < 0 ? 'danger' : 'default'}
        />
        <hr className="border-border-subtle" />
        <Row
          label={`Maker rebate (${rebate.data?.count ?? 0} fills)`}
          value={formatPnl(rebate.data?.netRebateUsdt ?? 0)}
          tone={
            (rebate.data?.netRebateUsdt ?? 0) > 0
              ? 'success'
              : (rebate.data?.netRebateUsdt ?? 0) < 0
                ? 'danger'
                : 'default'
          }
        />
        <Row
          label="Funding"
          value={formatPnl(totalFunding)}
          tone={totalFunding > 0 ? 'success' : totalFunding < 0 ? 'danger' : 'default'}
        />
      </dl>
    </Card>
  );
}

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : 'text-text-primary';
  return (
    <div className="flex items-center justify-between">
      <dt className="text-2xs uppercase tracking-wider text-text-muted">
        {label}
      </dt>
      <dd className={toneClass}>
        <Mono className="text-sm">{value}</Mono>
      </dd>
    </div>
  );
}
