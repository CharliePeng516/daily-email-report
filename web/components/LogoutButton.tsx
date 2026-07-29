import { Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

export default function LogoutButton() {
  return (
    <form action="/api/logout" method="POST">
      <Button type="submit" size="small" color="inherit" startIcon={<LogoutIcon />}>
        Sign out
      </Button>
    </form>
  );
}
