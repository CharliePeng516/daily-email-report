import { Tab, Tabs } from '@mui/material';
import NextLink from 'next/link';
import type { ProviderName } from '../lib/queries';

export default function ProviderTabs({ active, days }: { active: ProviderName; days: number }) {
  return (
    <Tabs value={active} sx={{ minHeight: 0 }}>
      <Tab
        label="Outlook"
        value="outlook"
        component={NextLink}
        href={`/?provider=outlook&days=${days}`}
      />
      <Tab
        label="Gmail"
        value="gmail"
        component={NextLink}
        href={`/?provider=gmail&days=${days}`}
      />
    </Tabs>
  );
}
