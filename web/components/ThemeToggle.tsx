'use client';

import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';
import { useColorScheme } from '@mui/material/styles';

const MODES = [
  { value: 'system', label: 'Match system', Icon: SettingsBrightnessOutlinedIcon },
  { value: 'light', label: 'Light mode', Icon: LightModeOutlinedIcon },
  { value: 'dark', label: 'Dark mode', Icon: DarkModeOutlinedIcon },
] as const;

export default function ThemeToggle() {
  const { mode, setMode } = useColorScheme();

  return (
    <ToggleButtonGroup
      value={mode ?? 'system'}
      exclusive
      size="small"
      onChange={(_, next) => next && setMode(next)}
      aria-label="Colour theme"
      sx={{
        '& .MuiToggleButton-root': { px: 0.75, py: 0.5, border: 0 },
      }}
    >
      {MODES.map(({ value, label, Icon }) => (
        <ToggleButton key={value} value={value} aria-label={label}>
          <Tooltip title={label}>
            <Icon fontSize="small" />
          </Tooltip>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
