import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import MailLockIcon from '@mui/icons-material/MarkEmailRead';
import { login } from './actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = '/', error } = await searchParams;

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 380, width: '100%' }}>
        <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <MailLockIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h6" component="h1">
            Daily Email Report
          </Typography>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            This dashboard shows personal inbox summaries — enter the access password to continue.
          </Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>Incorrect password.</Alert>}

        <Box component="form" action={login}>
          <input type="hidden" name="next" value={next} />
          <Stack spacing={2}>
            <TextField
              name="password"
              label="Password"
              type="password"
              autoFocus
              required
              fullWidth
              autoComplete="current-password"
            />
            <Button type="submit" variant="contained" size="large" fullWidth>
              Sign in
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
