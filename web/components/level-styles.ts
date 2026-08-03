import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { SvgIconComponent } from '@mui/icons-material';
import type { PriorityLevel } from '../lib/queries';

// Status palette (fixed, never themed) — reserved for state, same four steps
// on both surfaces. warning/serious sit below 3:1 on the light surface by
// design; the icon + visible text label pairing (never color alone) is the
// documented mitigation, so every badge built from this renders both.
export interface PriorityMeta {
  Icon: SvgIconComponent;
  color: string;
}

export const PRIORITY_META: Record<PriorityLevel, PriorityMeta> = {
  Critical: { Icon: ErrorOutlineIcon, color: '#d03b3b' }, // critical
  High: { Icon: WarningAmberIcon, color: '#ec835a' }, // serious
  Medium: { Icon: ScheduleIcon, color: '#fab219' }, // warning
  Low: { Icon: CheckCircleOutlineIcon, color: '#0ca30c' }, // good
};

export const LEVEL_ORDER: PriorityLevel[] = ['Critical', 'High', 'Medium', 'Low'];
