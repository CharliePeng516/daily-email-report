'use client';

import { Paper, Stack, Typography } from '@mui/material';
import { motion } from 'motion/react';
import type { ReportItem } from '../lib/queries';
import NumberTicker from './NumberTicker';

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Paper
      component={motion.div}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      variant="outlined"
      sx={{ px: 2, py: 1.25, flex: '1 1 120px' }}
    >
      <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
        <NumberTicker value={value} />
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Paper>
  );
}

export default function SummaryStats({ items }: { items: ReportItem[] }) {
  const total = items.length;
  const actionRequired = items.filter((item) => item.actionRequired).length;
  const urgent = items.filter((item) => item.level === 'Critical' || item.level === 'High').length;

  return (
    <Stack direction="row" spacing={1.5} flexWrap="wrap">
      <StatTile label={`Email${total === 1 ? '' : 's'}`} value={total} />
      <StatTile label="Need action" value={actionRequired} />
      <StatTile label="Critical + High" value={urgent} />
    </Stack>
  );
}
