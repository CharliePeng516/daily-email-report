import { Stack, Typography } from '@mui/material';
import { PRIORITY_META } from './level-styles';
import type { PriorityLevel } from '../lib/queries';

export default function PriorityBadge({
  level,
  score,
  size = 'medium',
}: {
  level: PriorityLevel;
  score?: number;
  size?: 'small' | 'medium';
}) {
  const { Icon, color } = PRIORITY_META[level];
  const iconSize = size === 'small' ? 14 : 16;

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
      <Icon sx={{ fontSize: iconSize, color }} />
      <Typography variant="caption" fontWeight={600} color="text.secondary" noWrap>
        {level}
        {typeof score === 'number' ? ` · ${score}` : ''}
      </Typography>
    </Stack>
  );
}
