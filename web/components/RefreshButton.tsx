'use client';

import { useState } from 'react';
import { Alert, Button, CircularProgress, Snackbar } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { ProviderName } from '../lib/queries';

// Local-dev only (see web/app/api/refresh/route.ts) — the server route
// returns a clear 501 if this is ever hit on an actual deployment, so this
// degrades to an explanatory error rather than silently doing nothing.
export default function RefreshButton({ provider }: { provider: ProviderName }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ severity: 'success' | 'info' | 'error'; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResult({ severity: 'error', text: data.error ?? 'Failed to start.' });
      } else if (data.status === 'already-running') {
        setResult({ severity: 'info', text: 'Already fetching for this provider — check back in a few minutes.' });
      } else {
        setResult({
          severity: 'success',
          text: `Started fetching ${provider} mail in the background. Large windows can take several minutes — reload this page later to see new data.`,
        });
      }
    } catch {
      setResult({ severity: 'error', text: 'Could not reach the server.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
        onClick={handleClick}
        disabled={loading}
      >
        Fetch new mail
      </Button>
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
