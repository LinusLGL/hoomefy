import { useHauntingStore } from './hauntingStore';
import { injectThemeStyles } from './palettes';

/**
 * Call before the first render so there is never a flash of the wrong palette:
 * injects both palettes and sets the persisted experience on <html>.
 */
export function bootstrapHaunting(doc: Document = document): void {
  injectThemeStyles(doc);
  const { experience, horrorEnabled } = useHauntingStore.getState();
  doc.documentElement.dataset.experience = horrorEnabled ? experience : 'elegant';
  doc.documentElement.dataset.horror = horrorEnabled ? 'on' : 'off';
}
