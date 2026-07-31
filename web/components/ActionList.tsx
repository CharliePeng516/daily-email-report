import { Card, CardContent, Checkbox, List, ListItem, ListItemIcon, ListItemText, Typography } from '@mui/material';
import type { ReportItem } from '../lib/queries';
import CategoryBadge from './CategoryBadge';

export default function ActionList({ items }: { items: ReportItem[] }) {
  const actionable = items.filter(
    (item) => item.actionRequired && (item.level === 'Critical' || item.level === 'High'),
  );

  if (actionable.length === 0) return null;

  return (
    <Card variant="outlined" sx={{ mb: 4, bgcolor: 'action.hover' }}>
      <CardContent>
        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          Today&apos;s Action List
        </Typography>
        <List disablePadding>
          {actionable.map((item) => (
            <ListItem key={item.messageId} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <Checkbox edge="start" disabled sx={{ p: 0 }} />
              </ListItemIcon>
              <ListItemText
                primary={item.sensitive ? item.summary : item.action ?? item.subject}
                secondary={<CategoryBadge category={item.category} size="small" />}
                slotProps={{ secondary: { component: 'div', sx: { mt: 0.25 } } }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
}
