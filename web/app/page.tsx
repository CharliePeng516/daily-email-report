import { AppBar, Box, Container, Stack, Toolbar, Typography } from '@mui/material';
import MailLockIcon from '@mui/icons-material/MarkEmailRead';
import { getDashboardData, type PriorityLevel, type ProviderName, type ReportItem } from '../lib/queries';
import ActionList from '../components/ActionList';
import DaysSelect from '../components/DaysSelect';
import ErrorsPanel from '../components/ErrorsPanel';
import LogoutButton from '../components/LogoutButton';
import PriorityLevelSection from '../components/PriorityLevelSection';
import ProviderTabs from '../components/ProviderTabs';
import RefreshButton from '../components/RefreshButton';
import { LEVEL_ORDER } from '../components/level-styles';

// Never statically cache — this dashboard reflects whatever the CLI most
// recently wrote to Postgres, so every request should query fresh.
export const dynamic = 'force-dynamic';

function groupByLevel(items: ReportItem[]): Record<PriorityLevel, ReportItem[]> {
  const groups: Record<PriorityLevel, ReportItem[]> = { Critical: [], High: [], Medium: [], Low: [] };
  for (const item of items) groups[item.level].push(item);
  return groups;
}

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
  const days = Math.max(1, Math.min(14, Number(params.days) || 2));

  const { items, errors, lastRunAt } = await getDashboardData(provider, days);
  const byLevel = groupByLevel(items);

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <MailLockIcon color="primary" />
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            School Email Report
          </Typography>
          <LogoutButton />
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <ProviderTabs active={provider} days={days} />

        <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 3 }}>
          <Stack>
            <Typography variant="body2" color="text.secondary">
              {formatLastRun(lastRunAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {items.length} email{items.length === 1 ? '' : 's'} in the last {days} day{days === 1 ? '' : 's'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <RefreshButton provider={provider} />
            <DaysSelect days={days} />
          </Stack>
        </Stack>

        <ErrorsPanel errors={errors} />
        <ActionList items={items} />

        {items.length === 0 ? (
          <Typography color="text.secondary">Nothing here yet — run the CLI for this provider to populate it.</Typography>
        ) : (
          LEVEL_ORDER.map((level) => (
            <PriorityLevelSection key={level} level={level} items={byLevel[level] ?? []} />
          ))
        )}
      </Container>
    </Box>
  );
}
