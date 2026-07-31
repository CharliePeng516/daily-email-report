import BoltIcon from '@mui/icons-material/Bolt';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import GroupsIcon from '@mui/icons-material/Groups';
import CampaignIcon from '@mui/icons-material/Campaign';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import SchoolIcon from '@mui/icons-material/School';
import ArticleIcon from '@mui/icons-material/Article';
import ReportGmailerrorredIcon from '@mui/icons-material/ReportGmailerrorred';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import type { SvgIconComponent } from '@mui/icons-material';

// Categorical palette assigned in fixed order (dataviz skill: 8 hues, never
// cycled/reassigned). "other" deliberately carries no hue — it's the fold-to-Other
// bucket, styled as neutral/muted instead of a 9th series.
export interface CategoryMeta {
  label: string;
  Icon: SvgIconComponent;
  light: string;
  dark: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  urgent_action: { label: 'Urgent Action', Icon: BoltIcon, light: '#2a78d6', dark: '#3987e5' }, // slot 1 blue
  deadline: { label: 'Deadline', Icon: HourglassBottomIcon, light: '#eb6834', dark: '#d95926' }, // slot 2 orange
  meeting: { label: 'Meeting', Icon: GroupsIcon, light: '#1baf7a', dark: '#199e70' }, // slot 3 aqua
  announcement: { label: 'Announcement', Icon: CampaignIcon, light: '#eda100', dark: '#c98500' }, // slot 4 yellow
  student_issue: { label: 'Student Issue', Icon: PersonOutlineIcon, light: '#e87ba4', dark: '#d55181' }, // slot 5 magenta
  teaching_admin: { label: 'Teaching & Admin', Icon: SchoolIcon, light: '#008300', dark: '#008300' }, // slot 6 green
  newsletter: { label: 'Newsletter', Icon: ArticleIcon, light: '#4a3aa7', dark: '#9085e9' }, // slot 7 violet
  spam: { label: 'Spam', Icon: ReportGmailerrorredIcon, light: '#e34948', dark: '#e66767' }, // slot 8 red
};

export const OTHER_CATEGORY_META: CategoryMeta = {
  label: 'Other',
  Icon: MoreHorizIcon,
  light: '#898781',
  dark: '#898781',
};

// Fixed display order — the same order the hues were assigned in, "other" last.
export const CATEGORY_ORDER: string[] = [
  'urgent_action',
  'deadline',
  'meeting',
  'announcement',
  'student_issue',
  'teaching_admin',
  'newsletter',
  'spam',
  'other',
];

export function getCategoryMeta(category: string): CategoryMeta {
  return CATEGORY_META[category] ?? OTHER_CATEGORY_META;
}

export function formatCategoryLabel(category: string): string {
  return getCategoryMeta(category).label;
}
