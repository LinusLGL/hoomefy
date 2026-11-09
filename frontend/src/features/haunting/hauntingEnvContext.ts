import { createContext, useContext } from 'react';

export interface HauntingContextValue {
  reducedMotion: boolean;
  mobile: boolean;
}

export const HauntingContext = createContext<HauntingContextValue>({ reducedMotion: false, mobile: false });

export const useHauntingEnv = (): HauntingContextValue => useContext(HauntingContext);
