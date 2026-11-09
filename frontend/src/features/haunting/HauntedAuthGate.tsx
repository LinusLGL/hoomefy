/**
 * HauntedAuthGate
 *
 * The first thing a Haunted visitor sees on the sign-in route: "Are You a Revisiting Companion or
 * New Soul?". A returning guest continues to the sign-in form; a new soul is sent to sign up.
 * The haunted video loops behind it.
 */

import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { KeyIcon, LanternIcon } from '@/components/icons/GateIcons';
import { ROUTES } from '@/utils/constants';
import { HauntedAuthBrand } from './HauntedAuthBrand';
import { HauntedBackdropVideo } from './HauntedBackdropVideo';

interface HauntedAuthGateProps {
  /** The visitor has been here before: show the sign-in form. */
  onReturning: () => void;
}

export function HauntedAuthGate({ onReturning }: HauntedAuthGateProps) {
  return (
    <div className="hf-auth hf-gate relative isolate flex min-h-screen justify-center overflow-hidden bg-navy-900 px-4 py-10">
      <HauntedBackdropVideo />

      <div className="hf-gate__content relative z-10 w-full">
        <HauntedAuthBrand />

        <h1 className="hf-gate__title">
          <span className="hf-gate__line hf-gate__line--small">Are You a</span>{' '}
          <span className="hf-gate__line hf-gate__line--large">Revisiting Companion</span>{' '}
          <span className="hf-gate__line hf-gate__line--large">
            or <em className="hf-gate__soul">New Soul?</em>
          </span>
        </h1>

        <p className="hf-gate__lead">
          The mansion remembers its familiar guests...
          <br className="hf-br" /> or will you be stepping inside for the first time?
        </p>

        <div className="hf-gate__cards">
          <button type="button" className="hf-gate__card hf-gate__card--companion" onClick={onReturning}>
            <LanternIcon className="hf-gate__emblem" />
            <h2 className="hf-gate__card-title">
              Revisiting
              <br />
              Companion
            </h2>
            <span className="hf-gate__card-rule" aria-hidden="true" />
            <p className="hf-gate__card-text">
              Welcome back...
              <br />
              The mansion has kept
              <br />
              your place.
            </p>
            <span className="hf-gate__go" aria-hidden="true">
              <ArrowRight />
            </span>
          </button>

          <Link to={ROUTES.signUp} className="hf-gate__card hf-gate__card--soul">
            <KeyIcon className="hf-gate__emblem" />
            <h2 className="hf-gate__card-title">New Soul</h2>
            <span className="hf-gate__card-rule" aria-hidden="true" />
            <p className="hf-gate__card-text">
              Begin your design journey
              <br />
              and uncover what
              <br />
              Hoomefy holds.
            </p>
            <span className="hf-gate__go" aria-hidden="true">
              <ArrowRight />
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
