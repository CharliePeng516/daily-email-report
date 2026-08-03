import { AppBar, Stack, Toolbar, Typography } from '@mui/material';
import MailLockIcon from '@mui/icons-material/MarkEmailRead';
import type { ProviderName } from '../lib/queries';
import { monoFont } from '../app/fonts';
import ProviderTabs from './ProviderTabs';
import ThemeToggle from './ThemeToggle';
import LogoutButton from './LogoutButton';

export default function Navbar({
  title,
  provider,
  days,
}: {
  title: string;
  provider: ProviderName;
  days: number;
}) {
  return (
    <AppBar
      position="static"
      color="transparent"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: 'divider' }}
    >
      <Toolbar sx={{ gap: 2, flexWrap: 'wrap', py: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1, minWidth: 0 }}>
          <MailLockIcon color="primary" />
          <Typography
            component="h1"
            noWrap
            sx={{
              fontFamily: monoFont.style.fontFamily,
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Typography>
        </Stack>

        <ProviderTabs active={provider} days={days} />

        <Stack direction="row" alignItems="center" spacing={0.5}>
          <ThemeToggle />
          <LogoutButton />
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
