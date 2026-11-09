/**
 * The Hoomefy mark in the Haunted experience: a house whose lower edge ripples like a sheet,
 * with two eyes. Drawn as a stroke icon so it takes the surrounding text colour.
 */

interface GhostHouseIconProps {
  className?: string;
}

export function GhostHouseIcon({ className }: GhostHouseIconProps) {
  return (
    <svg
      className={className}
      data-icon="ghost-house"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M16 3.2 5.2 9.4v17.4l2.9-2.3 2.6 2.3 2.7-2.3 2.6 2.3 2.7-2.3 2.6 2.3 2.7-2.3 2.8 2.3V9.4L16 3.2Z" />
      <circle cx="12.4" cy="14.8" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="19.6" cy="14.8" r="1.1" fill="currentColor" stroke="none" />
      <path d="M14.2 19.2c.5.5 1 .7 1.8.7s1.3-.2 1.8-.7" />
    </svg>
  );
}
