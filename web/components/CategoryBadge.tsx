import { Box, Typography } from '@mui/material';
import { getCategoryMeta } from './category-styles';

export default function CategoryBadge({
  category,
  size = 'medium',
}: {
  category: string;
  size?: 'small' | 'medium';
}) {
  const { label, Icon, light, dark } = getCategoryMeta(category);
  const iconSize = size === 'small' ? 12 : 14;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        minWidth: 0,
        px: size === 'small' ? 0.75 : 1,
        py: size === 'small' ? 0.25 : 0.4,
        borderRadius: '999px',
        border: '1px solid',
        borderColor: `${light}59`, // ~35% alpha
        bgcolor: `${light}1f`, // ~12% alpha
        '@media (prefers-color-scheme: dark)': {
          borderColor: `${dark}80`, // ~50% alpha
          bgcolor: `${dark}33`, // ~20% alpha
        },
      }}
    >
      <Icon
        sx={{
          fontSize: iconSize,
          color: light,
          flexShrink: 0,
          '@media (prefers-color-scheme: dark)': { color: dark },
        }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        noWrap
        sx={{ fontSize: size === 'small' ? 11 : 12, lineHeight: 1.4 }}
      >
        {label}
      </Typography>
    </Box>
  );
}
