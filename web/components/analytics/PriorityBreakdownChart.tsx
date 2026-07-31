import { Box, Stack, Tooltip, Typography } from '@mui/material';
import type { ReportItem, PriorityLevel } from '../../lib/queries';
import { LEVEL_ORDER, PRIORITY_META } from '../level-styles';

const LABEL_MIN_PCT = 8; // below this, the segment is too narrow for an inline "%" label

export default function PriorityBreakdownChart({ items }: { items: ReportItem[] }) {
  const total = items.length;
  const counts: Record<PriorityLevel, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const item of items) counts[item.level] += 1;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Priority mix
      </Typography>

      {total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No data yet.
        </Typography>
      ) : (
        <>
          <Stack
            direction="row"
            sx={{ height: 24, borderRadius: '4px', overflow: 'hidden', gap: '2px', bgcolor: 'action.hover' }}
          >
            {LEVEL_ORDER.filter((level) => counts[level] > 0).map((level) => {
              const count = counts[level];
              const pct = (count / total) * 100;
              const { color } = PRIORITY_META[level];
              return (
                <Tooltip key={level} title={`${level}: ${count} (${Math.round(pct)}%)`} arrow>
                  <Box
                    sx={{
                      width: `${pct}%`,
                      minWidth: 3,
                      bgcolor: color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {pct >= LABEL_MIN_PCT && (
                      <Typography variant="caption" sx={{ color: '#fff', fontWeight: 600, lineHeight: 1 }}>
                        {Math.round(pct)}%
                      </Typography>
                    )}
                  </Box>
                </Tooltip>
              );
            })}
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap" sx={{ mt: 1 }}>
            {LEVEL_ORDER.map((level) => {
              const count = counts[level];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const { Icon, color } = PRIORITY_META[level];
              return (
                <Stack key={level} direction="row" spacing={0.5} alignItems="center">
                  <Icon sx={{ fontSize: 14, color }} />
                  <Typography variant="caption" color="text.secondary">
                    {level}: {count} ({pct}%)
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        </>
      )}
    </Box>
  );
}
