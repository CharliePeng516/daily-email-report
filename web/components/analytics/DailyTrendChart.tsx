import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { ReportItem, PriorityLevel } from '../../lib/queries';
import { PRIORITY_META } from '../level-styles';

const CHART_HEIGHT = 120;
// Bottom → top stacking order (column-reverse places the first child at the baseline).
const STACK_ORDER: PriorityLevel[] = ['Low', 'Medium', 'High', 'Critical'];

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayLabel(key: string): { weekday: string; day: string } {
  const date = new Date(`${key}T00:00:00Z`);
  return {
    weekday: new Intl.DateTimeFormat('en-AU', { weekday: 'short', timeZone: 'UTC' }).format(date),
    day: new Intl.DateTimeFormat('en-AU', { day: 'numeric', timeZone: 'UTC' }).format(date),
  };
}

export default function DailyTrendChart({ items, days }: { items: ReportItem[]; days: number }) {
  const dayKeys: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    dayKeys.push(dayKey(new Date(now.getTime() - i * 86400000)));
  }

  const buckets = new Map<string, Record<PriorityLevel, number>>(
    dayKeys.map((key) => [key, { Critical: 0, High: 0, Medium: 0, Low: 0 }]),
  );
  for (const item of items) {
    const key = dayKey(item.receivedAt);
    const bucket = buckets.get(key);
    if (bucket) bucket[item.level] += 1;
  }

  const totals = dayKeys.map((key) => {
    const bucket = buckets.get(key)!;
    return bucket.Critical + bucket.High + bucket.Medium + bucket.Low;
  });
  const maxTotal = Math.max(...totals, 1);
  const peak = Math.max(...totals);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        Volume over the last {days} day{days === 1 ? '' : 's'}
      </Typography>

      <Stack direction="row" alignItems="flex-end" spacing={0.5} sx={{ height: CHART_HEIGHT + 20 }}>
        {dayKeys.map((key, index) => {
          const bucket = buckets.get(key)!;
          const total = totals[index];
          const present = STACK_ORDER.filter((level) => bucket[level] > 0);
          const topLevel = present[present.length - 1];
          const { weekday, day } = dayLabel(key);

          return (
            <Stack key={key} alignItems="center" spacing={0.5} sx={{ flex: 1, minWidth: 0, height: '100%' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1, height: 12 }}>
                {total === peak && total > 0 ? total : ' '}
              </Typography>

              <Stack
                direction="column-reverse"
                sx={{ width: '100%', maxWidth: 24, height: CHART_HEIGHT, gap: '2px' }}
              >
                {present.map((level) => {
                  const count = bucket[level];
                  const { color } = PRIORITY_META[level];
                  const heightPct = (count / maxTotal) * 100;
                  return (
                    <Tooltip key={level} title={`${level}: ${count} — ${weekday} ${day}`} arrow>
                      <Box
                        sx={{
                          width: '100%',
                          height: `${heightPct}%`,
                          minHeight: 3,
                          bgcolor: color,
                          borderTopLeftRadius: level === topLevel ? 4 : 0,
                          borderTopRightRadius: level === topLevel ? 4 : 0,
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </Stack>

              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: 1.2, textAlign: 'center' }}>
                {weekday}
                <br />
                {day}
              </Typography>
            </Stack>
          );
        })}
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1.5 }}>
        {STACK_ORDER.slice()
          .reverse()
          .map((level) => {
            const { Icon, color } = PRIORITY_META[level];
            return (
              <Stack key={level} direction="row" spacing={0.5} alignItems="center">
                <Icon sx={{ fontSize: 14, color }} />
                <Typography variant="caption" color="text.secondary">
                  {level}
                </Typography>
              </Stack>
            );
          })}
      </Stack>
    </Box>
  );
}
