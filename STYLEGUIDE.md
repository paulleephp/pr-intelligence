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
