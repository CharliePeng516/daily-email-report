import { Grid, Paper, Stack } from '@mui/material';
import type { ReportItem } from '../lib/queries';
import SummaryStats from './SummaryStats';
import PriorityBreakdownChart from './analytics/PriorityBreakdownChart';
import CategoryBreakdownChart from './analytics/CategoryBreakdownChart';
import DailyTrendChart from './analytics/DailyTrendChart';

export default function AnalyticsSection({ items, days }: { items: ReportItem[]; days: number }) {
  if (items.length === 0) return null;

  return (
    <Stack spacing={2} sx={{ mb: 4 }}>
      <SummaryStats items={items} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <PriorityBreakdownChart items={items} />
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
            <CategoryBreakdownChart items={items} />
          </Paper>
        </Grid>
        <Grid size={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <DailyTrendChart items={items} days={days} />
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
