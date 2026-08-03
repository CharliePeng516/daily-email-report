import { Box, Container, Stack, Typography } from '@mui/material';
import InsightsOutlinedIcon from '@mui/icons-material/InsightsOutlined';
import FactCheckOutlinedIcon from '@mui/icons-material/FactCheckOutlined';
import { getDashboardData, type ProviderName } from '../lib/queries';
import ActionList from '../components/ActionList';
import DaysSelect from '../components/DaysSelect';
import ErrorsPanel from '../components/ErrorsPanel';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import RefreshButton from '../components/RefreshButton';
import ReportView from '../components/ReportView';
import AnalyticsSection from '../components/AnalyticsSection';
import CollapsibleSection from '../components/CollapsibleSection';

// Never statically cache — this dashboard reflects whatever the CLI most
// recently wrote to Postgres, so every request should query fresh.
export const dynamic = 'force-dynamic';

function formatLastRun(date: Date | null): string {
  if (!date) return 'No successful run yet';
  return `Last run: ${new Intl.DateTimeFormat('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)}`;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; days?: string }>;
}) {
  const params = await searchParams;
  const provider: ProviderName = params.provider === 'gmail' ? 'gmail' : 'outlook';
  const days = Math.max(1, Math.min(90, Number(params.days) || 2));

  const { items, errors, lastRunAt } = await getDashboardData(provider, days);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title={provider === 'gmail' ? 'Daily Email Report' : 'School Email Report'}
        provider={provider}
        days={days}
      />

      <Container maxWidth="lg" sx={{ py: 4, px: { xs: 2, sm: 3, md: 4 }, flexGrow: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {formatLastRun(lastRunAt)} · last {days} day{days === 1 ? '' : 's'}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <RefreshButton provider={provider} days={days} />
            <DaysSelect days={days} />
          </Stack>
        </Stack>

        <ErrorsPanel errors={errors} />
        <ActionList items={items} />

        {items.length === 0 ? (
          <Typography color="text.secondary">Nothing here yet — run the CLI for this provider to populate it.</Typography>
        ) : (
          <>
            <CollapsibleSection id="dashboard" eyebrow="Overview" title="Report dashboard" Icon={InsightsOutlinedIcon}>
              <AnalyticsSection items={items} days={days} />
            </CollapsibleSection>

            <CollapsibleSection
              id="detailed-report"
              eyebrow="Full breakdown"
              title="Detailed report"
              count={items.length}
              Icon={FactCheckOutlinedIcon}
            >
              <ReportView items={items} />
            </CollapsibleSection>
          </>
        )}
      </Container>

      <Footer lastRunAt={lastRunAt} />
    </Box>
  );
}
