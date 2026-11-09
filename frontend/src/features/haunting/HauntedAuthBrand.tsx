/**
 * HauntedAuthBrand
 *
 * The Hoomefy mark and the red rule that head every Haunted sign-in and sign-up screen,
 * so the gate and the forms read as one design.
 */

import { Link } from 'react-router-dom';
import { GhostHouseIcon } from '@/components/icons/GhostHouseIcon';
import { ROUTES } from '@/utils/constants';

export function HauntedAuthBrand() {
  return (
    <>
      <Link to={ROUTES.home} className="hf-gate__brand">
        <GhostHouseIcon className="hf-gate__brand-icon" />
        <span className="hf-gate__brand-name">Hoomefy</span>
      </Link>
      <div className="hf-gate__rule" aria-hidden="true" />
    </>
  );
}
