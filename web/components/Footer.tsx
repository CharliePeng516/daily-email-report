'use client';

import { Box, Container, Stack, Typography } from '@mui/material';
import { keyframes } from '@mui/material/styles';
import { monoFont } from '../app/fonts';

const breathe = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

export default function Footer({ lastRunAt }: { lastRunAt: Date | null }) {
  const live = lastRunAt !== null;

  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', mt: 6 }}>
      <Container maxWidth="lg">
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
          sx={{ py: 2 }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontFamily: monoFont.style.fontFamily,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Daily Email Report
          </Typography>

          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: live ? 'primary.main' : 'text.disabled',
                ...(live && {
                  '@media (prefers-reduced-motion: no-preference)': {
                    animation: `${breathe} 2.4s ease-in-out infinite`,
                  },
                }),
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontFamily: monoFont.style.fontFamily,
                letterSpacing: '0.06em',
              }}
            >
              SIGNAL: {live ? 'LIVE' : 'NONE'}
            </Typography>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
