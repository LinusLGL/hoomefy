/**
 * The two emblems on the Haunted sign-up gate: a glowing lantern (returning guests) and an
 * ornate brass key (new arrivals). Decorative; the cards carry the accessible text.
 */

interface IconProps {
  className?: string;
}

export function LanternIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 100" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="hf-lantern-glow" cx="50%" cy="55%" r="55%">
          <stop offset="0" stopColor="#fff2c2" />
          <stop offset="0.35" stopColor="#ffb44a" />
          <stop offset="1" stopColor="#8a3a0c" />
        </radialGradient>
        <linearGradient id="hf-lantern-metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9c9a8" />
          <stop offset="1" stopColor="#6e5a38" />
        </linearGradient>
      </defs>
      {/* ring and handle */}
      <circle cx="32" cy="7" r="4.5" stroke="url(#hf-lantern-metal)" strokeWidth="2.4" />
      <path d="M15 30c0-14 8-20 17-20s17 6 17 20" stroke="url(#hf-lantern-metal)" strokeWidth="2.4" strokeLinecap="round" />
      {/* cap */}
      <path d="M17 31h30l-5-9H22l-5 9Z" fill="url(#hf-lantern-metal)" />
      <rect x="14" y="31" width="36" height="4.5" rx="1.5" fill="#bda97f" />
      {/* glass */}
      <path d="M17 36h30l-2 38H19l-2-38Z" fill="url(#hf-lantern-glow)" opacity="0.95" />
      <path d="M32 44c4 5 6 9 3 14-1 2-4 2-6 0-3-4-1-9 3-14Z" fill="#fff6d6" opacity="0.95" />
      {/* frame bars */}
      <path d="M17 36l2 38M47 36l-2 38M32 36v38" stroke="url(#hf-lantern-metal)" strokeWidth="2" />
      {/* base */}
      <rect x="15" y="74" width="34" height="5" rx="1.5" fill="#bda97f" />
      <path d="M18 79h28l-4 9H22l-4-9Z" fill="url(#hf-lantern-metal)" />
    </svg>
  );
}

export function KeyIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 100" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hf-key-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe9a8" />
          <stop offset="0.5" stopColor="#d9a441" />
          <stop offset="1" stopColor="#7c5314" />
        </linearGradient>
      </defs>
      <g transform="rotate(32 32 50)" fill="url(#hf-key-gold)">
        {/* ornate bow: a trefoil around an open centre */}
        <circle cx="32" cy="15" r="8" />
        <circle cx="22" cy="24" r="8" />
        <circle cx="42" cy="24" r="8" />
        <circle cx="32" cy="24" r="6.5" fill="#2a0a0e" />
        <circle cx="32" cy="24" r="2.4" fill="url(#hf-key-gold)" />
        {/* collar and shaft */}
        <rect x="26" y="33" width="12" height="4" rx="2" />
        <rect x="29.5" y="37" width="5" height="46" rx="2" />
        <rect x="26" y="50" width="12" height="3.5" rx="1.75" />
        {/* bit */}
        <path d="M34.500 66h9v5h-4v5h-5v-10Zm0 12h6v5h-6v-5Z" />
        <path d="M29.500 83l2.500 5 2.500-5h-5Z" />
      </g>
    </svg>
  );
}
