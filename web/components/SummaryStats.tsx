import { Box, Paper, Stack, Typography } from '@mui/material';
import type { ReportItem } from '../lib/queries';
import { CATEGORY_ORDER, getCategoryMeta } from './category-styles';

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.25, flex: '1 1 120px' }}>
      <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

export default function SummaryStats({ items }: { items: ReportItem[] }) {
  const total = items.length;
  const actionRequired = items.filter((item) => item.actionRequired).length;
  const urgent = items.filter((item) => item.level === 'Critical' || item.level === 'High').length;

  const counts = new Map<string, number>();
  for (const item of items) {
    const key = CATEGORY_ORDER.includes(item.category) ? item.category : 'other';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const present = CATEGORY_ORDER.filter((category) => (counts.get(category) ?? 0) > 0);

  if (total === 0) return null;

  return (
    <Stack spacing={2} sx={{ mb: 3 }}>
      <Stack direction="row" spacing={1.5} flexWrap="wrap">
        <StatTile label={`Email${total === 1 ? '' : 's'}`} value={total} />
        <StatTile label="Need action" value={actionRequired} />
        <StatTile label="Critical + High" value={urgent} />
      </Stack>

      <Box>
        <Stack
          direction="row"
          sx={{ height: 10, borderRadius: '5px', overflow: 'hidden', gap: '2px', bgcolor: 'action.hover' }}
        >
          {present.map((category) => {
            const count = counts.get(category) ?? 0;
            const meta = getCategoryMeta(category);
            const pct = (count / total) * 100;
            return (
              <Box
                key={category}
                title={`${meta.label}: ${count} (${Math.round(pct)}%)`}
                sx={(theme) => ({
                  width: `${pct}%`,
                  minWidth: 3,
                  bgcolor: meta.light,
                  ...theme.applyStyles('dark', { bgcolor: meta.dark }),
                })}
              />
            );
          })}
        </Stack>

        <Stack direction="row" spacing={1.75} flexWrap="wrap" sx={{ mt: 1 }}>
          {present.map((category) => {
            const meta = getCategoryMeta(category);
            return (
              <Stack key={category} direction="row" spacing={0.5} alignItems="center">
                <Box
                  sx={(theme) => ({
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: meta.light,
                    ...theme.applyStyles('dark', { bgcolor: meta.dark }),
                  })}
                />
                <Typography variant="caption" color="text.secondary">
                  {meta.label} ({counts.get(category)})
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}
