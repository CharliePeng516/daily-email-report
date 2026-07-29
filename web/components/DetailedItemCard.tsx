import { Card, CardContent, Chip, Link as MuiLink, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EventIcon from '@mui/icons-material/Event';
import type { ReportItem } from '../lib/queries';
import { LEVEL_COLOR } from './level-styles';

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
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Typography variant="subtitle1" fontWeight={600}>
            {item.subject}
          </Typography>
          <Chip label={`Priority ${item.score}`} color={LEVEL_COLOR[item.level]} size="small" />
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          From {item.senderAddress}
        </Typography>

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
