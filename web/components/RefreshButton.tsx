'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, CircularProgress, Snackbar, Stack, TextField } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { ProviderName } from '../lib/queries';

const MIN_DAYS = 1;
const MAX_DAYS = 90;

// Local-dev only (see web/app/api/refresh/route.ts) — the server route
// returns a clear 501 if this is ever hit on an actual deployment, so this
// degrades to an explanatory error rather than silently doing nothing.
export default function RefreshButton({ provider, days }: { provider: ProviderName; days: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sinceDays, setSinceDays] = useState(String(days));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ severity: 'success' | 'info' | 'error'; text: string } | null>(null);

  function clampedDays(): number | null {
    const parsed = Number(sinceDays);
    if (!Number.isInteger(parsed) || parsed < MIN_DAYS || parsed > MAX_DAYS) return null;
    return parsed;
  }

  async function handleClick() {
    const parsedDays = clampedDays();
    if (parsedDays === null) {
      setResult({ severity: 'error', text: `Enter a whole number of days between ${MIN_DAYS} and ${MAX_DAYS}.` });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, sinceDays: parsedDays }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ severity: 'error', text: data.error ?? 'Failed to start.' });
      } else if (data.status === 'already-running') {
        setResult({ severity: 'info', text: 'Already fetching for this provider — check back in a few minutes.' });
      } else {
        setResult({
          severity: 'success',
          text: `Started fetching the last ${parsedDays} day${parsedDays === 1 ? '' : 's'} of ${provider} mail in the background. Large windows can take several minutes — reload this page later to see new data.`,
        });
        // Line up the display window with what was just requested, so a
        // reload once the job finishes shows the newly-fetched range.
        const params = new URLSearchParams(searchParams.toString());
        params.set('days', String(parsedDays));
        router.push(`/?${params.toString()}`);
      }
    } catch {
      setResult({ severity: 'error', text: 'Could not reach the server.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          label="Fetch last"
          type="number"
          value={sinceDays}
          onChange={(e) => setSinceDays(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && handleClick()}
          slotProps={{
            htmlInput: { min: MIN_DAYS, max: MAX_DAYS, style: { width: 44 } },
            input: { endAdornment: <span style={{ opacity: 0.6, fontSize: 13 }}>days</span> },
          }}
        />
        <Button
          variant="outlined"
          size="small"
          startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
          onClick={handleClick}
          disabled={loading}
        >
          Fetch &amp; analyze
        </Button>
      </Stack>
      <Snackbar open={result !== null} autoHideDuration={10000} onClose={() => setResult(null)}>
        {result ? (
          <Alert severity={result.severity} onClose={() => setResult(null)} sx={{ maxWidth: 420 }}>
            {result.text}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
