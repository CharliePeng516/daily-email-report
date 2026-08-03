'use client';

import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { ReportItem } from '../../lib/queries';
import { CATEGORY_ORDER, getCategoryMeta } from '../category-styles';

export default function CategoryBreakdownChart({ items }: { items: ReportItem[] }) {
  const total = items.length;
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = CATEGORY_ORDER.includes(item.category) ? item.category : 'other';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const rows = CATEGORY_ORDER.filter((category) => (counts.get(category) ?? 0) > 0)
    .map((category) => ({ category, count: counts.get(category)! }))
    .sort((a, b) => b.count - a.count);

  const max = rows.reduce((m, row) => Math.max(m, row.count), 0);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        By category
      </Typography>

      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No data yet.
        </Typography>
      ) : (
        <Stack spacing={0.75}>
          {rows.map(({ category, count }) => {
            const meta = getCategoryMeta(category);
            const pct = Math.round((count / total) * 100);
            const widthPct = max > 0 ? (count / max) * 100 : 0;
            return (
              <Stack key={category} direction="row" spacing={1} alignItems="center">
                <Stack
                  direction="row"
                  spacing={0.5}
                  alignItems="center"
                  sx={{ width: 152, flexShrink: 0 }}
                >
                  <meta.Icon
                    sx={(theme) => ({
                      fontSize: 14,
                      color: meta.light,
                      ...theme.applyStyles('dark', { color: meta.dark }),
                    })}
                  />
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {meta.label}
                  </Typography>
                </Stack>

                <Tooltip title={`${meta.label}: ${count} (${pct}%)`} arrow>
                  <Box sx={{ flex: 1, height: 16 }}>
                    <Box
                      sx={(theme) => ({
                        width: `${widthPct}%`,
                        minWidth: 4,
                        height: '100%',
                        borderRadius: '4px',
                        bgcolor: meta.light,
                        ...theme.applyStyles('dark', { bgcolor: meta.dark }),
                      })}
                    />
                  </Box>
                </Tooltip>

                <Typography variant="caption" color="text.secondary" sx={{ width: 68, flexShrink: 0, textAlign: 'right' }}>
                  {count} ({pct}%)
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
