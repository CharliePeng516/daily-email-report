import { Stack, Typography } from '@mui/material';
import { getCategoryMeta } from './category-styles';

export default function CategoryBadge({
  category,
  size = 'medium',
}: {
  category: string;
  size?: 'small' | 'medium';
}) {
  const { label, Icon, light, dark } = getCategoryMeta(category);
  const iconSize = size === 'small' ? 14 : 16;

  return (
    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0 }}>
      <Icon
        sx={{
          fontSize: iconSize,
          color: light,
          '@media (prefers-color-scheme: dark)': { color: dark },
        }}
      />
      <Typography variant="caption" color="text.secondary" noWrap>
        {label}
      </Typography>
    </Stack>
  );
}
