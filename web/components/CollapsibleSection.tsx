'use client';

import { useEffect, useState } from 'react';
import { Box, ButtonBase, Divider, Paper, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { SvgIconComponent } from '@mui/icons-material';
import { monoFont } from '../app/fonts';

const STORAGE_PREFIX = 'der:section-collapsed:';

/**
 * A named, collapsible panel used to keep top-level report sections (the
 * dashboard, the detailed report) visually and structurally distinct.
 * Collapse state persists per-section in localStorage so a reader's layout
 * choice survives a refresh.
 */
export default function CollapsibleSection({
  id,
  eyebrow,
  title,
  count,
  Icon,
  defaultExpanded = true,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  count?: number;
  Icon: SvgIconComponent;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hydrated, setHydrated] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_PREFIX + id);
    if (stored !== null) setExpanded(stored !== 'collapsed');
    setHydrated(true);
  }, [id]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_PREFIX + id, expanded ? 'expanded' : 'collapsed');
  }, [expanded, hydrated, id]);

  return (
    <Paper
      variant="outlined"
      sx={{ mb: 3, overflow: 'hidden', borderRadius: 2.5 }}
    >
      <ButtonBase
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          px: { xs: 2, sm: 3 },
          py: 1.75,
          textAlign: 'left',
          borderRadius: 0,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ width: '100%' }}>
          <Icon color="primary" sx={{ fontSize: 20 }} />
          <Stack spacing={0.1} sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: monoFont.style.fontFamily,
                fontWeight: 600,
                fontSize: 10.5,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'text.secondary',
              }}
            >
              {eyebrow}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.75}>
              <Typography variant="subtitle1" fontWeight={600} noWrap>
                {title}
              </Typography>
              {typeof count === 'number' && (
                <Typography variant="body2" color="text.secondary">
                  ({count})
                </Typography>
              )}
            </Stack>
          </Stack>
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.25, ease: 'easeInOut' }}
            style={{ display: 'flex' }}
          >
            <ExpandMoreIcon color="action" />
          </motion.div>
        </Stack>
      </ButtonBase>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.3, ease: [0.32, 0.72, 0, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <Divider />
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.5, pb: { xs: 2, sm: 3 } }}>{children}</Box>
          </motion.div>
        )}
      </AnimatePresence>
    </Paper>
  );
}
