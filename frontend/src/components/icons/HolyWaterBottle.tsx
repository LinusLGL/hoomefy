/**
 * HolyWaterBottle
 *
 * A small corked glass vial of pale blue water with a gold cross. It is drawn with flat shapes only
 * (no gradients, so several copies on one page never clash on ids) and is decorative: the buttons
 * that hold it carry the accessible name.
 */

interface HolyWaterBottleProps {
  className?: string;
}

export function HolyWaterBottle({ className }: HolyWaterBottleProps) {
  return (
    <svg viewBox="0 0 40 56" className={className} aria-hidden="true" focusable="false" data-icon="holy-water">
      {/* cork */}
      <rect x="15" y="2" width="10" height="7" rx="1.6" fill="#a1703d" />
      <rect x="15" y="2" width="10" height="2.4" rx="1.2" fill="#c89256" />
      {/* neck and lip */}
      <rect x="13.5" y="8.5" width="13" height="3.6" rx="1.3" fill="#dcecff" fillOpacity="0.85" />
      <rect x="16" y="12" width="8" height="6" fill="#bcdcff" fillOpacity="0.35" stroke="#dcecff" strokeOpacity="0.9" strokeWidth="1" />
      {/* glass body */}
      <path
        d="M16 17.5C8.5 20 5 26 5 34c0 9 5.6 16.5 15 16.5S35 43 35 34c0-8-3.5-14-11-16.5z"
        fill="#9ed2ff"
        fillOpacity="0.3"
        stroke="#dcecff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* water */}
      <path
        d="M6.4 31.5C8.4 29.6 11 30.6 13.2 31.8s5 1.6 7.2.2 5-2.2 7.4-.8c2.4 1.3 4.4.9 5.8-.2.6 7-4.4 17.9-14 17.9S5.6 40.6 6.4 31.5z"
        fill="#7cc4ff"
        fillOpacity="0.85"
      />
      {/* gold cross */}
      <path d="M20 33v10M15.6 37.2h8.8" stroke="#f3dc9c" strokeWidth="2.4" strokeLinecap="round" />
      {/* highlight */}
      <path d="M10.2 28.5c.6-2.4 2.4-4.4 5-5.4" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
