'use client';

import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Box, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import type { ReportItem, PriorityLevel } from '../lib/queries';
import DetailedItemCard from './DetailedItemCard';

const DETAILED_LEVELS: PriorityLevel[] = ['Critical', 'High'];

export default function GroupSection({
  title,
  Icon,
  light,
  dark,
  items,
  secondaryBadge,
}: {
  title: string;
  Icon: SvgIconComponent;
  light: string;
  dark?: string;
  items: ReportItem[];
  /** Renders the "other axis" indicator on condensed rows (e.g. category when grouped by priority, or vice versa). */
  secondaryBadge: (item: ReportItem) => React.ReactNode;
}) {
  const [detailedParent] = useAutoAnimate<HTMLDivElement>({ duration: 200 });
  const [condensedParent] = useAutoAnimate<HTMLUListElement>({ duration: 200 });

  if (items.length === 0) return null;

  const detailed = items.filter((item) => DETAILED_LEVELS.includes(item.level));
  const condensed = items.filter((item) => !DETAILED_LEVELS.includes(item.level));

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Icon
          sx={(theme) => ({
            fontSize: 20,
            color: light,
            ...theme.applyStyles('dark', { color: dark ?? light }),
          })}
        />
        <Typography variant="h6" component="h2">
          {title} <Typography component="span" color="text.secondary">({items.length})</Typography>
        </Typography>
      </Stack>

      {detailed.length > 0 && (
        <Stack ref={detailedParent} spacing={1.5} sx={{ mb: condensed.length > 0 ? 1.5 : 0 }}>
          {detailed.map((item) => (
            <DetailedItemCard key={item.messageId} item={item} />
          ))}
        </Stack>
      )}

      {condensed.length > 0 && (
        <List ref={condensedParent} disablePadding dense>
          {condensed.map((item) => (
            <ListItem key={item.messageId} disableGutters sx={{ py: 0.5, alignItems: 'flex-start', gap: 1.5 }}>
              <Box sx={{ pt: 0.25 }}>{secondaryBadge(item)}</Box>
              <ListItemText
                primary={item.sensitive ? item.summary : `${item.subject} — ${item.summary}`}
                slotProps={{ primary: { variant: 'body2', color: 'text.secondary' } }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
