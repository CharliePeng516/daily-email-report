'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, CircularProgress, Snackbar, Stack, TextField } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { ProviderName } from '../lib/queries';

const MIN_DAYS = 1;
const MAX_DAYS = 90;
const POLL_INTERVAL_MS = 4000;
const MAX_POLL_MS = 8 * 60 * 1000; // give up watching after 8 minutes; the job itself keeps running regardless

type Phase = 'idle' | 'starting' | 'running';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Local-dev only (see web/app/api/refresh/route.ts) — the server route
// returns a clear 501 if this is ever hit on an actual deployment, so this
// degrades to an explanatory error rather than silently doing nothing.
export default function RefreshButton({ provider, days }: { provider: ProviderName; days: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sinceDays, setSinceDays] = useState(String(days));
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<{ severity: 'success' | 'info' | 'error'; text: string } | null>(null);
  const cancelledRef = useRef(false);

  useEffect(
    () => () => {
      cancelledRef.current = true;
    },
    [],
  );

  function clampedDays(): number | null {
    const parsed = Number(sinceDays);
    if (!Number.isInteger(parsed) || parsed < MIN_DAYS || parsed > MAX_DAYS) return null;
    return parsed;
  }

  /** Polls GET /api/refresh until this provider drops out of `inFlight`, then returns. */
  async function pollUntilFinished(): Promise<'finished' | 'timeout'> {
    const deadline = Date.now() + MAX_POLL_MS;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      if (cancelledRef.current) return 'finished';
      try {
        const res = await fetch('/api/refresh');
        const data = (await res.json()) as { inFlight?: string[] };
        if (!data.inFlight?.includes(provider)) return 'finished';
      } catch {
        // transient network hiccup — keep polling
      }
    }
    return 'timeout';
  }

  async function handleClick() {
    const parsedDays = clampedDays();
    if (parsedDays === null) {
      setResult({ severity: 'error', text: `Enter a whole number of days between ${MIN_DAYS} and ${MAX_DAYS}.` });
      return;
    }

    setPhase('starting');
    let started = false;
    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, sinceDays: parsedDays }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ severity: 'error', text: data.error ?? 'Failed to start.' });
      } else {
        started = true;
        setResult(
          data.status === 'already-running'
            ? { severity: 'info', text: 'Already fetching for this provider — watching for it to finish…' }
            : {
                severity: 'success',
                text: `Fetching the last ${parsedDays} day${parsedDays === 1 ? '' : 's'} of ${provider} mail — this can take a few minutes. The page will refresh automatically when it's done.`,
              },
        );
        const params = new URLSearchParams(searchParams.toString());
        params.set('days', String(parsedDays));
        router.push(`/?${params.toString()}`);
      }
    } catch {
      setResult({ severity: 'error', text: 'Could not reach the server.' });
    }

    if (!started) {
      setPhase('idle');
      return;
    }

    setPhase('running');
    const outcome = await pollUntilFinished();
    if (cancelledRef.current) return;

    setPhase('idle');
    if (outcome === 'finished') {
      setResult({ severity: 'success', text: 'Fetch finished — refreshing the dashboard…' });
      router.refresh();
    } else {
      setResult({
        severity: 'info',
        text: 'Still running after several minutes — reload the page shortly to check for new data.',
      });
    }
  }

  const loading = phase !== 'idle';
  const buttonLabel = phase === 'starting' ? 'Starting…' : phase === 'running' ? 'Fetching…' : 'Fetch & analyze';

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
          disabled={loading}
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
          {buttonLabel}
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
