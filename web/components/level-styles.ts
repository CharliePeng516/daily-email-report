import type { PriorityLevel } from '../lib/queries';

export const LEVEL_COLOR: Record<PriorityLevel, 'error' | 'warning' | 'info' | 'default'> = {
  Critical: 'error',
  High: 'warning',
  Medium: 'info',
  Low: 'default',
};

export const LEVEL_ORDER: PriorityLevel[] = ['Critical', 'High', 'Medium', 'Low'];
