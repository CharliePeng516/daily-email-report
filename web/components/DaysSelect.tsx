'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Chip, Stack, TextField } from '@mui/material';

const PRESETS = [1, 2, 3, 7, 14, 30];
const MIN_DAYS = 1;
const MAX_DAYS = 90;

export default function DaysSelect({ days }: { days: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(String(days));

  function navigate(next: number) {
    const clamped = Math.max(MIN_DAYS, Math.min(MAX_DAYS, next));
    setValue(String(clamped));
    const params = new URLSearchParams(searchParams.toString());
    params.set('days', String(clamped));
    router.push(`/?${params.toString()}`);
  }

  function commit() {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= MIN_DAYS && parsed <= MAX_DAYS) {
      navigate(parsed);
    } else {
      setValue(String(days)); // invalid entry — revert to the current window
    }
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <TextField
        size="small"
        label="Showing last"
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        slotProps={{
          htmlInput: { min: MIN_DAYS, max: MAX_DAYS, style: { width: 44 } },
          input: { endAdornment: <span style={{ opacity: 0.6, fontSize: 13 }}>days</span> },
        }}
      />
      <Stack direction="row" spacing={0.5} flexWrap="wrap">
        {PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={preset}
            size="small"
            clickable
            variant={days === preset ? 'filled' : 'outlined'}
            color={days === preset ? 'primary' : 'default'}
            onClick={() => navigate(preset)}
          />
        ))}
      </Stack>
    </Stack>
  );
}
