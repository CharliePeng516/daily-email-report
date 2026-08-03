import { Alert, AlertTitle, Stack, Typography } from '@mui/material';
import type { ReportError } from '../lib/queries';

export default function ErrorsPanel({ errors }: { errors: ReportError[] }) {
  if (errors.length === 0) return null;

  return (
    <Alert severity="warning" sx={{ mb: 4 }}>
      <AlertTitle>Processing errors ({errors.length})</AlertTitle>
      <Stack spacing={0.5}>
        {errors.map((error, index) => (
          <Typography key={index} variant="body2">
            {error.subject}: {error.error}
          </Typography>
        ))}
      </Stack>
    </Alert>
  );
}
