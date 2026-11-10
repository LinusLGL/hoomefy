import { describe, expect, it } from 'vitest';
import { buildEditPrompt, cleanText, hasStyleText, MAX_FREE_TEXT } from './prompt';
import { fitToModelSize } from './dimensions';
import { isDesignStyle, STYLE_ORDER, STYLES } from './styles';

describe('buildEditPrompt', () => {
  it('asks to edit the photograph and keep the layout', () => {
    const prompt = buildEditPrompt({ style: 'scandinavian' });
    expect(prompt).toMatch(/^Edit this photograph of a room\./);
    expect(prompt).toMatch(/Keep the exact room layout/);
    expect(prompt).toMatch(/camera angle/);
    expect(prompt).toMatch(/window and door/);
  });

  it('puts the chosen theme into the prompt, so each theme gives a different instruction', () => {
    const prompts = (['scandinavian', 'japandi', 'modern-luxury', 'minimalist', 'halloween'] as const).map((style) => buildEditPrompt({ style }));
    expect(new Set(prompts).size).toBe(5);
    expect(prompts[0]).toContain(STYLES.scandinavian.prompt);
    expect(prompts[4]).toMatch(/pumpkins/i);
  });

  it('uses the visitor\'s own words for the custom style', () => {
    const text = 'a modern Japanese-inspired interior with warm oak furniture and a low platform bed';
    const prompt = buildEditPrompt({ style: 'custom', customStyle: `  ${text}\n\n` });
    expect(prompt).toContain(text);
    expect(prompt).not.toContain('Scandinavian');
  });

  it('has no colour palette sentence and does not name a kind of room', () => {
    const prompt = buildEditPrompt({ style: 'minimalist', instructions: 'add more plants' });
    expect(prompt).not.toMatch(/colour palette/);
    expect(prompt).not.toMatch(/living room|bedroom|kitchen|office|bathroom/);
  });

  it('changes how far it goes with the intensity', () => {
    const subtle = buildEditPrompt({ style: 'japandi', intensity: 0.1 });
    const bold = buildEditPrompt({ style: 'japandi', intensity: 1 });
    expect(subtle).toMatch(/subtle makeover/);
    expect(bold).toMatch(/dramatic redesign/);
  });

  it('clamps an out-of-range intensity', () => {
    expect(buildEditPrompt({ style: 'japandi', intensity: 5 })).toMatch(/dramatic redesign/);
    expect(buildEditPrompt({ style: 'japandi', intensity: -5 })).toMatch(/subtle makeover/);
  });

  describe('the visitor\'s own words', () => {
    it('come first, as the priority, ahead of the style', () => {
      const prompt = buildEditPrompt({ style: 'scandinavian', instructions: 'Paint the walls deep red and add a green velvet sofa.' });
      expect(prompt).toContain('"Paint the walls deep red and add a green velvet sofa"');
      expect(prompt).toMatch(/request comes first and must be clearly visible/);
      expect(prompt.indexOf('deep red')).toBeLessThan(prompt.indexOf(STYLES.scandinavian.prompt));
      expect(prompt).toMatch(/For everything the request does not mention, restyle the interior in this look: Scandinavian style/);
    });

    it('let the layout rules give way to what is asked for', () => {
      const prompt = buildEditPrompt({ style: 'japandi', instructions: 'add a window on the left wall' });
      expect(prompt).toMatch(/Change those only where the request above asks for it/);
      expect(prompt).not.toMatch(/Change only the furniture design/);
    });

    it('leave the strict layout rules alone when nothing was asked', () => {
      for (const instructions of [undefined, '', '   ', '\n\t']) {
        const prompt = buildEditPrompt({ style: 'japandi', instructions });
        expect(prompt).toMatch(/Change only the furniture design/);
        expect(prompt).not.toMatch(/request/);
      }
    });

    it('are cleaned: quotes, control characters, spacing, a closing full stop and length', () => {
      const prompt = buildEditPrompt({ style: 'minimalist', instructions: '  keep the "fireplace"\u0000 and\n\n add plants!!  ' });
      expect(prompt).toContain(`"keep the 'fireplace' and add plants"`);
      const long = buildEditPrompt({ style: 'minimalist', instructions: 'x'.repeat(2000) });
      expect(long).toContain(`"${'x'.repeat(MAX_FREE_TEXT)}"`);
    });

    it('work with the custom style too', () => {
      const prompt = buildEditPrompt({ style: 'custom', customStyle: 'cosy cabin', instructions: 'a stone fireplace' });
      expect(prompt).toContain('"a stone fireplace"');
      expect(prompt).toContain('restyle the interior in this look: cosy cabin.');
    });
  });
});


describe('cleanText and hasStyleText', () => {
  it('collapses whitespace, drops control characters and limits the length', () => {
    expect(cleanText('  a\u0000b\n\n c\t d ')).toBe('a b c d');
    expect(cleanText('x'.repeat(900))).toHaveLength(MAX_FREE_TEXT);
    expect(cleanText(undefined)).toBe('');
  });

  it('needs words for the custom style only', () => {
    expect(hasStyleText('scandinavian')).toBe(true);
    expect(hasStyleText('custom')).toBe(false);
    expect(hasStyleText('custom', '  ')).toBe(false);
    expect(hasStyleText('custom', 'cozy cabin')).toBe(true);
  });
});

describe('themes', () => {
  it('offers the five themes and a custom one, all with a card', () => {
    expect(STYLE_ORDER).toEqual(['scandinavian', 'japandi', 'modern-luxury', 'minimalist', 'halloween', 'custom']);
    for (const id of STYLE_ORDER) {
      expect(STYLES[id].name).toBeTruthy();
      expect(STYLES[id].swatches).toHaveLength(3);
    }
  });

  it('rejects names from the old ten-style list', () => {
    expect(isDesignStyle('japandi')).toBe(true);
    expect(isDesignStyle('haunted-chic')).toBe(false);
    expect(isDesignStyle('constructor')).toBe(false);
    expect(isDesignStyle(null)).toBe(false);
  });
});

describe('fitToModelSize', () => {
  it('keeps the proportions with sides that are multiples of 8', () => {
    expect(fitToModelSize(4000, 3000)).toEqual({ width: 1024, height: 768 });
    expect(fitToModelSize(1100, 782)).toEqual({ width: 1024, height: 728 });
    expect(fitToModelSize(3000, 4000)).toEqual({ width: 768, height: 1024 });
  });

  it('never scales a small photograph up', () => {
    expect(fitToModelSize(640, 480)).toEqual({ width: 640, height: 480 });
  });

  it('stays inside the range the model accepts', () => {
    const s = fitToModelSize(12000, 300);
    expect(s.width).toBe(1024);
    expect(s.height).toBeGreaterThanOrEqual(256);
    expect(s.width % 8).toBe(0);
    expect(s.height % 8).toBe(0);
  });

  it('copes with nonsense input', () => {
    expect(fitToModelSize(0, 0)).toEqual({ width: 1024, height: 1024 });
    expect(fitToModelSize(-5, 10)).toEqual({ width: 1024, height: 1024 });
  });
});
