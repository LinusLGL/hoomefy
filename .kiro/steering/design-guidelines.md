# Hoomefy Design Guidelines

**Purpose:** Visual design standards, UI/UX principles, and brand guidelines for Hoomefy.

## Brand Identity

### Core Values
- **Premium:** High-quality, sophisticated design that rivals professional interior design platforms
- **Magical:** Subtle supernatural elements that delight without overwhelming
- **Helpful:** Clear, intuitive interface that guides users through the experience
- **Trustworthy:** Professional appearance that builds confidence in AI capabilities

### Brand Personality
- Sophisticated yet approachable
- Magical yet grounded
- Professional yet playful
- Modern yet timeless

## Visual Design System

### Color Palette

**Primary Colors:**
```css
--midnight-navy: #0A1128;      /* Deep, sophisticated backgrounds */
--deep-purple: #1C0B33;        /* Accent for mysterious elements */
--warm-amber: #D4A574;         /* Primary CTA, highlights */
--ivory: #F5F1E8;              /* Text, light backgrounds */
--gold-accent: #C9A961;        /* Premium touches, borders */
```

**Semantic Colors:**
```css
--success: #4CAF50;            /* Successful generation, confirmations */
--error: #EF4444;              /* Errors, destructive actions */
--warning: #FFA726;            /* Warnings, cautions */
--info: #2196F3;               /* Informational messages */
```

**Haunted Palette (Overlays):**
```css
--ghost-white: rgba(255, 255, 255, 0.9);
--mist-overlay: rgba(200, 200, 255, 0.1);
--shadow-dark: rgba(0, 0, 0, 0.6);
--glow-amber: rgba(212, 165, 116, 0.4);
--ethereal-purple: rgba(147, 112, 219, 0.3);
```

**Color Usage Rules:**

1. **Midnight Navy** - Main backgrounds, navigation, footers
2. **Warm Amber** - Primary buttons, links, key highlights
3. **Ivory** - Body text, light backgrounds, cards
4. **Deep Purple** - Secondary elements, haunted mode accents
5. **Gold Accent** - Borders, dividers, premium badges

**Contrast Requirements:**
- Text on midnight navy: Use ivory or warm amber (≥4.5:1)
- Text on ivory: Use midnight navy or deep purple (≥4.5:1)
- Interactive elements: Maintain 3:1 contrast with surroundings

### Typography

**Font Families:**
```css
--font-heading: 'Playfair Display', serif;
--font-body: 'Inter', -apple-system, sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

**Type Scale:**
```css
--text-xs: 0.75rem;     /* 12px - Small captions */
--text-sm: 0.875rem;    /* 14px - Secondary text */
--text-base: 1rem;      /* 16px - Body text */
--text-lg: 1.125rem;    /* 18px - Lead paragraphs */
--text-xl: 1.25rem;     /* 20px - Section headings */
--text-2xl: 1.5rem;     /* 24px - Card titles */
--text-3xl: 1.875rem;   /* 30px - Page headings */
--text-4xl: 2.25rem;    /* 36px - Hero headings */
--text-5xl: 3rem;       /* 48px - Main hero */
--text-6xl: 3.75rem;    /* 60px - Landing hero (desktop) */
```

**Font Weights:**
```css
--font-light: 300;      /* Subtle text, large headings */
--font-normal: 400;     /* Body text */
--font-medium: 500;     /* Emphasized text */
--font-semibold: 600;   /* Subheadings */
--font-bold: 700;       /* Headings, CTAs */
```

**Line Heights:**
```css
--leading-tight: 1.25;  /* Large headings */
--leading-snug: 1.375;  /* Subheadings */
--leading-normal: 1.5;  /* Body text */
--leading-relaxed: 1.625; /* Long-form content */
```

**Usage:**
- **Headings:** Playfair Display, bold, tight line-height
- **Body:** Inter, normal weight, normal line-height
- **Buttons:** Inter, semibold, uppercase optional
- **Captions:** Inter, normal/medium, small size

### Spacing System

**Base Unit:** 4px (0.25rem)

```css
--space-0: 0;
--space-1: 0.25rem;   /* 4px - Tight spacing */
--space-2: 0.5rem;    /* 8px - Button padding, small gaps */
--space-3: 0.75rem;   /* 12px - Compact elements */
--space-4: 1rem;      /* 16px - Standard spacing */
--space-5: 1.25rem;   /* 20px - Comfortable spacing */
--space-6: 1.5rem;    /* 24px - Section spacing */
--space-8: 2rem;      /* 32px - Component separation */
--space-10: 2.5rem;   /* 40px - Large gaps */
--space-12: 3rem;     /* 48px - Section padding */
--space-16: 4rem;     /* 64px - Major sections */
--space-20: 5rem;     /* 80px - Hero spacing */
--space-24: 6rem;     /* 96px - Page sections */
```

**Spacing Guidelines:**
- Buttons: `padding: space-3 space-6` (12px 24px)
- Cards: `padding: space-6` (24px)
- Section gaps: `gap: space-12` (48px)
- Page margins: `padding: space-16 space-8` (64px 32px)

### Border Radius

```css
--rounded-none: 0;
--rounded-sm: 0.125rem;   /* 2px - Subtle rounding */
--rounded: 0.25rem;       /* 4px - Standard UI elements */
--rounded-md: 0.375rem;   /* 6px - Buttons, inputs */
--rounded-lg: 0.5rem;     /* 8px - Cards, containers */
--rounded-xl: 0.75rem;    /* 12px - Prominent cards */
--rounded-2xl: 1rem;      /* 16px - Hero elements */
--rounded-full: 9999px;   /* Circular buttons, avatars */
```

**Usage:**
- Buttons: `rounded-md` (6px)
- Input fields: `rounded-md` (6px)
- Cards: `rounded-lg` or `rounded-xl` (8-12px)
- Images: `rounded-lg` (8px)
- Modals: `rounded-2xl` (16px)

### Shadows

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Haunted glow shadows */
--shadow-glow: 0 0 20px rgba(212, 165, 116, 0.3);
--shadow-glow-lg: 0 0 40px rgba(212, 165, 116, 0.4);
```

**Usage:**
- Cards: `shadow-md`
- Elevated elements: `shadow-lg`
- Modals, overlays: `shadow-2xl`
- Hover states: Increase shadow depth
- Haunted effects: `shadow-glow`

## Component Design Patterns

### Buttons

**Primary Button:**
```tsx
<button className="
  bg-amber-600 hover:bg-amber-700
  text-navy-900 font-semibold
  px-6 py-3 rounded-md
  shadow-md hover:shadow-lg
  transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2
">
  Design My Room
</button>
```

**Secondary Button:**
```tsx
<button className="
  bg-transparent border-2 border-amber-600
  text-amber-600 hover:bg-amber-600 hover:text-navy-900
  font-semibold px-6 py-3 rounded-md
  transition-colors duration-200
  focus:outline-none focus:ring-2 focus:ring-amber-500
">
  Learn More
</button>
```

**Ghost Button:**
```tsx
<button className="
  bg-transparent hover:bg-white/10
  text-ivory font-medium
  px-4 py-2 rounded-md
  transition-colors duration-200
">
  Cancel
</button>
```

### Input Fields

```tsx
<div className="space-y-2">
  <label className="block text-sm font-medium text-ivory">
    Email Address
  </label>
  <input
    type="email"
    className="
      w-full px-4 py-3 rounded-md
      bg-navy-800 border border-navy-700
      text-ivory placeholder-navy-400
      focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20
      transition-colors duration-200
    "
    placeholder="you@example.com"
  />
</div>
```

### Cards

```tsx
<div className="
  bg-ivory rounded-xl shadow-lg
  p-6 space-y-4
  hover:shadow-xl transition-shadow duration-300
">
  <h3 className="text-2xl font-bold text-navy-900">
    Modern Minimalist
  </h3>
  <p className="text-navy-700 leading-relaxed">
    Clean lines, neutral colors, and functional design.
  </p>
</div>
```

### Image Containers

```tsx
<div className="relative overflow-hidden rounded-lg group">
  <img
    src="/image.jpg"
    alt="Room design"
    className="
      w-full h-full object-cover
      transition-transform duration-300
      group-hover:scale-105
    "
  />
  <div className="
    absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent
    opacity-0 group-hover:opacity-100
    transition-opacity duration-300
  ">
    <div className="absolute bottom-4 left-4 text-ivory">
      <p className="font-semibold">View Details</p>
    </div>
  </div>
</div>
```

## Layout Patterns

### Hero Section

```tsx
<section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-900 via-purple-900 to-navy-900 px-8">
  <div className="max-w-4xl text-center space-y-8">
    <h1 className="text-6xl md:text-7xl font-bold text-ivory font-heading">
      Your Dream Home, Reimagined
    </h1>
    <p className="text-xl text-ivory/80 leading-relaxed">
      One photo. Endless possibilities. A hauntingly beautiful experience.
    </p>
    <button className="bg-amber-600 hover:bg-amber-700 text-navy-900 font-bold px-8 py-4 rounded-md text-lg shadow-lg hover:shadow-xl transition-all">
      Design My Room
    </button>
  </div>
</section>
```

### Grid Layouts

**Style Cards Grid:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {styles.map(style => (
    <StyleCard key={style.id} {...style} />
  ))}
</div>
```

**Project Gallery:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
  {projects.map(project => (
    <ProjectCard key={project.id} {...project} />
  ))}
</div>
```

### Three-Panel Studio Layout

```tsx
<div className="flex flex-col lg:flex-row min-h-screen">
  {/* Left Panel - Controls */}
  <aside className="lg:w-80 bg-navy-900 p-6 space-y-6">
    <RoomTypeSelector />
    <StyleSelector />
    <PreferencesPanel />
  </aside>
  
  {/* Center Panel - Image Viewer */}
  <main className="flex-1 bg-navy-800 p-8">
    <ImageViewer />
  </main>
  
  {/* Right Panel - Assistant */}
  <aside className="lg:w-96 bg-navy-900 p-6">
    <MoriAssistant />
  </aside>
</div>
```

## Animation Guidelines

### Transition Timing

```css
--duration-fast: 150ms;       /* Micro-interactions */
--duration-normal: 200ms;     /* Standard transitions */
--duration-slow: 300ms;       /* Deliberate transitions */
--duration-slower: 500ms;     /* Page transitions */
```

### Easing Functions

```css
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
--ease-ghost: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### Animation Examples

**Fade In:**
```css
.fade-in {
  animation: fadeIn 300ms ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

**Slide Up:**
```css
.slide-up {
  animation: slideUp 400ms ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Scale In:**
```css
.scale-in {
  animation: scaleIn 300ms ease-out;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Hover Lift:**
```css
.card {
  transition: transform 200ms ease-out, shadow 200ms ease-out;
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-xl);
}
```

### Haunted Animations

**Floating Ghost:**
```css
.ghost-float {
  animation: ghostFloat 3s ease-in-out infinite;
}

@keyframes ghostFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

**Ethereal Glow:**
```css
.ethereal-glow {
  animation: glow 2s ease-in-out infinite alternate;
}

@keyframes glow {
  from { box-shadow: 0 0 10px rgba(212, 165, 116, 0.3); }
  to { box-shadow: 0 0 20px rgba(212, 165, 116, 0.6); }
}
```

**Mist Flow:**
```css
.mist {
  animation: mistFlow 20s linear infinite;
}

@keyframes mistFlow {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}
```

## Responsive Design

### Breakpoints

```css
--screen-sm: 640px;   /* Small tablets */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Small laptops */
--screen-xl: 1280px;  /* Desktops */
--screen-2xl: 1536px; /* Large desktops */
```

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```tsx
<div className="
  p-4 sm:p-6 md:p-8
  text-base sm:text-lg md:text-xl
  grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
">
  {/* Content */}
</div>
```

### Touch-Friendly Targets

- Minimum tap target: 44x44px
- Button padding: At least 12px vertical, 24px horizontal
- Adequate spacing between interactive elements (8px minimum)

## Accessibility

### Color Contrast

- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- Interactive elements: 3:1 against adjacent colors

### Focus Indicators

```css
*:focus-visible {
  outline: 2px solid var(--amber-500);
  outline-offset: 2px;
}
```

### Screen Reader Text

```tsx
<span className="sr-only">
  Hidden text for screen readers
</span>
```

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### ARIA Labels

```tsx
<button aria-label="Close dialog">
  <X className="w-5 h-5" />
</button>

<img src="/room.jpg" alt="Modern minimalist living room with white sofa" />

<nav aria-label="Main navigation">
  {/* Navigation items */}
</nav>
```

### Keyboard Navigation

- All interactive elements must be keyboard accessible
- Logical tab order
- Visible focus indicators
- Support arrow keys for galleries and sliders

## Haunted Mode Design

### Principles

1. **Subtle Over Obvious:** Effects should enhance, not distract
2. **Performance First:** Smooth 60fps animations
3. **User Control:** Easy toggle to disable
4. **Accessibility:** Respect `prefers-reduced-motion`

### Haunted Elements

**Mori the Ghost:**
- Friendly, non-scary design
- Soft white/translucent appearance
- Gentle floating animation
- Appears in right panel of studio

**Atmospheric Effects:**
- Subtle fog/mist overlay
- Floating particles (stars, sparkles)
- Soft moving shadows
- Gentle color shifts

**Interactive Enhancements:**
- Button hover glows
- Particle trails on cursor
- Success animations with ghostly silhouettes
- Transformation ritual during generation

### Normal Mode

When haunted effects are disabled:
- Remove all animations
- Hide Mori mascot
- Clear atmospheric overlays
- Maintain clean, professional interface
- All functionality remains identical

## Design Checklist

Before considering a component complete:

- [ ] Matches brand color palette
- [ ] Uses correct typography scale
- [ ] Spacing follows 4px grid system
- [ ] Responsive on all breakpoints (375px to 1920px)
- [ ] Hover states defined for interactive elements
- [ ] Focus indicators visible
- [ ] Loading states implemented
- [ ] Error states designed
- [ ] Empty states considered
- [ ] ARIA labels where needed
- [ ] Color contrast ≥4.5:1
- [ ] Touch targets ≥44x44px
- [ ] Animations respect prefers-reduced-motion
- [ ] Works in Normal and Haunted modes

---

**Remember:** Great design is invisible. Users should focus on their room transformations, not on the interface itself.
