import { useEffect, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

// Keep in sync with the inline script in index.html, which applies the theme before first paint.
const STORAGE_KEY = 'swiftdrop.theme';

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

function applyChoice(choice: ThemeChoice): void {
  // No data-theme attribute means "follow the OS" (handled by prefers-color-scheme in CSS).
  if (choice === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', choice);
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);

  useEffect(() => {
    applyChoice(choice);
    try {
      if (choice === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Storage unavailable (private mode etc.) — the choice lasts for this visit only.
    }
  }, [choice]);

  return { choice, setChoice };
}

const OPTIONS: { value: ThemeChoice; label: string; icon: JSX.Element }[] = [
  { value: 'light', label: 'Light theme', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark theme', icon: <MoonIcon /> },
  { value: 'system', label: 'Match system theme', icon: <MonitorIcon /> },
];

export function ThemeSwitch() {
  const { choice, setChoice } = useTheme();
  return (
    <div className="theme-switch" role="group" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={choice === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => setChoice(option.value)}
        >
          {option.icon}
        </button>
      ))}
    </div>
  );
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function SunIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}
