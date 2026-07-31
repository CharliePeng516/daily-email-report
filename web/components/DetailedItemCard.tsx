import { Card, CardContent, Link as MuiLink, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EventIcon from '@mui/icons-material/Event';
import type { ReportItem } from '../lib/queries';
import { getCategoryMeta } from './category-styles';
import CategoryBadge from './CategoryBadge';
import PriorityBadge from './PriorityBadge';

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export default function DetailedItemCard({ item }: { item: ReportItem }) {
  const category = getCategoryMeta(item.category);

  return (
    <Card
      variant="outlined"
      sx={(theme) => ({
        borderLeftWidth: 4,
        borderLeftColor: category.light,
        ...theme.applyStyles('dark', { borderLeftColor: category.dark }),
      })}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Typography variant="subtitle1" fontWeight={600}>
            {item.subject}
          </Typography>
          <PriorityBadge level={item.level} score={item.score} />
        </Stack>

        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
          <CategoryBadge category={item.category} />
          <Typography variant="body2" color="text.secondary">
            From {item.senderAddress}
          </Typography>
        </Stack>

        <Typography variant="body2" sx={{ mt: 1.5 }}>
          {item.summary}
        </Typography>

        {!item.sensitive && item.action && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>Action:</strong> {item.action}
          </Typography>
        )}

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mt: 1.5 }}>
          {item.deadline && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <EventIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {formatDateTime(item.deadline)}
              </Typography>
            </Stack>
          )}
          {item.webLink && (
            <MuiLink
              href={item.webLink}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}
            >
              Open <OpenInNewIcon sx={{ fontSize: 14 }} />
            </MuiLink>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
