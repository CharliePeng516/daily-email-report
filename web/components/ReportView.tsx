'use client';

import { useMemo, useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { Box, Chip, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import type { PriorityLevel, ReportItem } from '../lib/queries';
import { LEVEL_ORDER, PRIORITY_META } from './level-styles';
import { CATEGORY_ORDER, getCategoryMeta } from './category-styles';
import CategoryBadge from './CategoryBadge';
import PriorityBadge from './PriorityBadge';
import GroupSection from './GroupSection';

type View = 'priority' | 'category';

function categoryKeyOf(item: ReportItem): string {
  return CATEGORY_ORDER.includes(item.category) ? item.category : 'other';
}

export default function ReportView({ items }: { items: ReportItem[] }) {
  const [view, setView] = useState<View>('priority');
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [activeLevels, setActiveLevels] = useState<Set<PriorityLevel>>(new Set());
  const [groupsParent] = useAutoAnimate<HTMLDivElement>({ duration: 200 });

  const categoriesPresent = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const key = categoryKeyOf(item);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return CATEGORY_ORDER.filter((category) => counts.has(category)).map((category) => ({
      category,
      count: counts.get(category)!,
    }));
  }, [items]);

  const levelsPresent = useMemo(() => {
    const counts = new Map<PriorityLevel, number>();
    for (const item of items) counts.set(item.level, (counts.get(item.level) ?? 0) + 1);
    return LEVEL_ORDER.filter((level) => counts.has(level)).map((level) => ({ level, count: counts.get(level)! }));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(
      (item) =>
        (activeCategories.size === 0 || activeCategories.has(categoryKeyOf(item))) &&
        (activeLevels.size === 0 || activeLevels.has(item.level)),
    );
  }, [items, activeCategories, activeLevels]);

  function toggleCategory(category: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function toggleLevel(level: PriorityLevel) {
    setActiveLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  const filtersActive = activeCategories.size > 0 || activeLevels.size > 0;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1.5} sx={{ mb: 2 }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.25 }}>
              Priority
            </Typography>
            <Chip
              label="All"
              size="small"
              onClick={() => setActiveLevels(new Set())}
              color={activeLevels.size === 0 ? 'primary' : 'default'}
              variant={activeLevels.size === 0 ? 'filled' : 'outlined'}
            />
            {levelsPresent.map(({ level, count }) => {
              const meta = PRIORITY_META[level];
              const selected = activeLevels.has(level);
              return (
                <Chip
                  key={level}
                  icon={<meta.Icon sx={{ fontSize: '16px !important' }} />}
                  label={`${level} (${count})`}
                  size="small"
                  onClick={() => toggleLevel(level)}
                  variant={selected ? 'filled' : 'outlined'}
                  sx={{
                    borderColor: meta.color,
                    ...(selected && { bgcolor: meta.color, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }),
                  }}
                />
              );
            })}
          </Stack>

          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.25 }}>
              Category
            </Typography>
            <Chip
              label="All"
              size="small"
              onClick={() => setActiveCategories(new Set())}
              color={activeCategories.size === 0 ? 'primary' : 'default'}
              variant={activeCategories.size === 0 ? 'filled' : 'outlined'}
            />
            {categoriesPresent.map(({ category, count }) => {
              const meta = getCategoryMeta(category);
              const selected = activeCategories.has(category);
              return (
                <Chip
                  key={category}
                  icon={<meta.Icon sx={{ fontSize: '16px !important' }} />}
                  label={`${meta.label} (${count})`}
                  size="small"
                  onClick={() => toggleCategory(category)}
                  variant={selected ? 'filled' : 'outlined'}
                  sx={(theme) => ({
                    borderColor: meta.light,
                    ...(selected && { bgcolor: meta.light, color: '#fff', '& .MuiChip-icon': { color: '#fff' } }),
                    ...theme.applyStyles('dark', {
                      borderColor: meta.dark,
                      ...(selected && { bgcolor: meta.dark }),
                    }),
                  })}
                />
              );
            })}
          </Stack>

          {filtersActive && (
            <Chip
              label="Clear filters"
              size="small"
              variant="outlined"
              onClick={() => {
                setActiveCategories(new Set());
                setActiveLevels(new Set());
              }}
              sx={{ alignSelf: 'flex-start' }}
            />
          )}
        </Stack>

        <ToggleButtonGroup
          value={view}
          exclusive
          size="small"
          onChange={(_, next) => next && setView(next)}
        >
          <ToggleButton value="priority" sx={{ gap: 0.5, textTransform: 'none' }}>
            <ViewListOutlinedIcon fontSize="small" /> By priority
          </ToggleButton>
          <ToggleButton value="category" sx={{ gap: 0.5, textTransform: 'none' }}>
            <CategoryOutlinedIcon fontSize="small" /> By category
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {filteredItems.length === 0 ? (
        <Typography color="text.secondary">No emails match this filter.</Typography>
      ) : (
        <Box ref={groupsParent}>
          {view === 'priority'
            ? LEVEL_ORDER.map((level) => {
                const meta = PRIORITY_META[level];
                return (
                  <GroupSection
                    key={level}
                    title={level}
                    Icon={meta.Icon}
                    light={meta.color}
                    items={filteredItems.filter((item) => item.level === level)}
                    secondaryBadge={(item) => <CategoryBadge category={item.category} size="small" />}
                  />
                );
              })
            : CATEGORY_ORDER.map((category) => {
                const meta = getCategoryMeta(category);
                return (
                  <GroupSection
                    key={category}
                    title={meta.label}
                    Icon={meta.Icon}
                    light={meta.light}
                    dark={meta.dark}
                    items={filteredItems.filter((item) => categoryKeyOf(item) === category)}
                    secondaryBadge={(item) => <PriorityBadge level={item.level} size="small" />}
                  />
                );
              })}
        </Box>
      )}
    </Box>
  );
}
