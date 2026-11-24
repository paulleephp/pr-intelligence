# Style Guide

## Tailwind & Prettier

**Tailwind classes are auto-sorted** by `prettier-plugin-tailwindcss` in this order:
Layout → Box Model → Typography → Visual → Interactive → Responsive

```bash
npm run format:fix    # Auto-format all files
npm run format        # Check formatting
```

Config in `.prettierrc.json`:

- 2-space indent
- Double quotes
- 100 char line width
- Trailing commas (ES5)
- Tailwind class sorting enabled

**IDE setup**: Enable "format on save" in VS Code.

## Colors and brand

Adopted 2026-11-24. Visual reference: open [docs/style-guide.html](./docs/style-guide.html) in a browser. Implementation is tracked as U7 (colors) and U8 (logo) in `planning/PENDING_NEW_FEATURES.md`; until then, the code still uses the old palette.

### Anchors (unchanged)

| Role | Value |
|------|-------|
| Title gradient | `emerald-400` `#34d399` → `cyan-400` `#22d3ee` |
| Primary button (CTA) | `emerald-500` `#10b981`, black text, hover `emerald-400` |

Every other color is derived from these in OKLCH: theme hue 187° (teal), complement 7°. Don't introduce new hues; add a token here first.

### Severity

| Level | Text | Mark (dot, bar, border) | Badge |
|-------|------|-------------------------|-------|
| critical | `#f7a3a9` | `#dd3858` | **Solid** `#d22c50`, white text |
| high | `#feb992` | `#fa8233` | Outline: border = mark at ~55% opacity, transparent fill, dot + text |
| medium | `#fed48c` | `#fecf7f` | Outline |
| low | `#8dd5fb` | `#37b2e8` | Outline |
| none | `#a1a1aa` | `#52525b` | Outline, border `#3a4241` |

- **No tinted fills** on high/medium/low badges. Orange or yellow at low opacity over the dark background renders as brown or olive.
- Critical is the only solid badge, so it reads as its own level.
- Never show severity by color alone: badges and legends always include the label.
- Lightness differs by level on purpose (critical darkest, medium lightest) so levels stay distinct with red-green color blindness. Don't equalize them.

### File status and PR state

| Item | Text | Notes |
|------|------|-------|
| added | `#7bbb9d` | Muted (low chroma) so severity stays the loudest color in a row |
| modified | `#a1a1aa` | Neutral: most common status, and must not resemble medium severity |
| removed / deleted | `#d8969d` | |
| renamed | `#76b4d5` | |
| copied | `#b89ed3` | |
| Status badge border | `#2f3a37` | Transparent fill |
| PR open | `#4ad59f` | |
| PR merged | `#cb98f9` | Theme triad (187° + 120°) |
| PR closed | `#f2939f` | |

### Neutral surfaces (optional)

Zinc tinted slightly toward the theme hue: page `#0a0e0e`, card `#141a19`, border `#212827`. Plain zinc remains acceptable.

### Brand mark

- File: [docs/brand/mark.svg](./docs/brand/mark.svg). "Diff lines": three diff lines, the middle one with a finding marker. Dark teal glyph `#06231f` on the title gradient, 8px corner radius at 32px.
- Header: mark at 28px + wordmark "PR Intelligence" in near-white (`#f4f4f5`), bold display font. The wordmark is not theme green; the mark carries the theme.
- Favicon: the same mark. Place it where the App Router expects icon files (check `node_modules/next/dist/docs/`); the old `favicon.ico` at the repo root isn't served.
- Don't recolor the mark, place it on a light background, or pair it with an emoji.

## Next.js Image Component

**Always use `<Image />` from `next/image`, never native `<img>`.**

### Basic Usage

```tsx
import Image from "next/image";

// Fixed dimensions (avatars, logos)
<Image src={url} alt="description" width={40} height={40} />

// Responsive (full-width)
<div className="relative h-96 w-full">
  <Image src={url} alt="description" fill className="object-cover" sizes="..." />
</div>

// Local import
import logo from "@/public/logo.svg";
<Image src={logo} alt="logo" />  // width/height auto-detected
```

### Required Props

- `src`: URL or imported file
- `alt`: Accessibility text (required)
- `width` + `height`: For fixed sizes (or use `fill` for responsive)
- `className`: Tailwind classes

### Key Props

- `fill`: Makes image responsive (requires parent `relative` + explicit dimensions)
- `priority`: Disables lazy loading (use only for above-the-fold images)
- `sizes`: Responsive breakpoints with `fill`
- `placeholder`: "blur" with `blurDataURL` for loading state

### External Domains

Add to `next.config.ts`:

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "avatars.githubusercontent.com",
    },
  ],
}
```

### Common Patterns

```tsx
// Avatar
<Image src={avatarUrl} alt={name} width={40} height={40} className="rounded-full" />

// Hero
<div className="relative h-screen w-full">
  <Image src={heroUrl} alt="hero" fill priority className="object-cover" />
</div>

// Card image
<div className="relative h-48 w-full">
  <Image src={cardUrl} alt="card" fill className="object-cover rounded-lg" />
</div>
```

❌ **Never**: Use native `<img>`, skip `alt`, omit width/height for fixed sizes, use `<Image>` with only className for sizing.

## Public Assets

Store static files in `/public/` and reference by path:

```
public/
├── images/
│   ├── icons/
│   ├── ui/
│   └── logos/
├── fonts/
└── data/
```

Use `<Image />` for all image types. For SVGs, either import as image or component.

**Don't store**: Secrets, dynamic uploads, files >5MB, sensitive data.

## Testing

See **[TESTING.md](./TESTING.md)** for comprehensive testing guide.

Quick reference:

```bash
npm test                  # Watch mode
npm test -- --run         # Run once
npm run test:ui           # Browser UI
npm run test:coverage     # Coverage report
```
