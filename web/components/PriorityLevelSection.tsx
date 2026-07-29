import { Box, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import type { PriorityLevel, ReportItem } from '../lib/queries';
import DetailedItemCard from './DetailedItemCard';

const DETAILED_LEVELS: PriorityLevel[] = ['Critical', 'High'];

export default function PriorityLevelSection({ level, items }: { level: PriorityLevel; items: ReportItem[] }) {
  if (items.length === 0) return null;

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
        {level} <Typography component="span" color="text.secondary">({items.length})</Typography>
      </Typography>

      {DETAILED_LEVELS.includes(level) ? (
        <Stack spacing={1.5}>
          {items.map((item) => (
            <DetailedItemCard key={item.messageId} item={item} />
          ))}
        </Stack>
      ) : (
        <List disablePadding dense>
          {items.map((item) => (
            <ListItem key={item.messageId} disableGutters sx={{ py: 0.5 }}>
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
