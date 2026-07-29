'use client';

import { MenuItem, TextField } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';

const OPTIONS = [1, 2, 3, 7, 14];

export default function DaysSelect({ days }: { days: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('days', value);
    router.push(`/?${params.toString()}`);
  }

  return (
    <TextField
      select
      size="small"
      label="Window"
      value={days}
      onChange={(e) => handleChange(e.target.value)}
      sx={{ minWidth: 140 }}
    >
      {OPTIONS.map((option) => (
        <MenuItem key={option} value={option}>
          Last {option} day{option === 1 ? '' : 's'}
        </MenuItem>
      ))}
    </TextField>
  );
}
