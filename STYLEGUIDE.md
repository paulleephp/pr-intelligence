# Style Guide - PR Intelligence

## Tailwind CSS Class Ordering

This project uses **prettier-plugin-tailwindcss** to automatically sort Tailwind CSS classes according to Tailwind's recommended order. This ensures consistency across the codebase and improves readability.

### Why Class Ordering Matters

- **Consistency**: Maintains uniform class organization across all components
- **Maintainability**: Easier to scan and understand which properties are applied
- **Merge Conflicts**: Reduces merge conflicts when multiple developers modify classes
- **Performance**: Optimized order improves CSS specificity and rendering performance

### Tailwind Class Order (Automatic)

prettier-plugin-tailwindcss sorts classes into these categories:

1. **Layout** - `display`, `position`, `flex`, `grid`, `float`
   - Examples: `flex`, `block`, `grid`, `absolute`, `sticky`

2. **Box Model** - Spacing, sizing, borders, shadows
   - Examples: `p-4`, `m-2`, `w-full`, `h-screen`, `border`, `shadow-lg`

3. **Typography** - Font properties, text styling
   - Examples: `text-lg`, `font-bold`, `text-center`, `text-white`

4. **Visual** - Colors, backgrounds, opacity, transforms
   - Examples: `bg-black`, `text-emerald-500`, `opacity-50`, `scale-110`

5. **Interactive** - Hover, focus, active states
   - Examples: `hover:bg-gray-200`, `focus:outline-none`, `active:scale-95`

6. **Responsive** - Media query variants
   - Examples: `sm:w-full`, `md:grid-cols-2`, `lg:text-lg`

### Before Formatting

```tsx
// Unsorted - hard to read
<div className="hover:bg-emerald-400 text-emerald-500 p-6 bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-lg flex items-center gap-2">
```

### After Formatting

```tsx
// Sorted automatically - clean and organized
<div className="flex items-center gap-2 border border-zinc-800 rounded-lg bg-zinc-900/30 p-6 text-emerald-500 backdrop-blur-sm hover:bg-emerald-400">
```

## Using Prettier

### Check Formatting (Without Changes)

```bash
npm run format
```

### Fix Formatting (Auto-format Files)

```bash
npm run format:fix
```

### Format Specific File

```bash
npx prettier --write path/to/file.tsx
```

### Running Before Commit

Always run `npm run format:fix` before committing to ensure consistent formatting:

```bash
npm run format:fix
npm run lint:fix
npm run build
git add .
git commit -m "your message"
```

## Prettier Configuration

Configuration is in `.prettierrc.json`:

```json
{
  "plugins": ["prettier-plugin-tailwindcss"],
  "tailwindConfig": "./tailwind.config.ts",
  "semi": true,
  "singleQuote": false,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

### Settings Explanation

- **plugins**: Enables Tailwind class sorting
- **tailwindConfig**: Path to Tailwind configuration
- **semi**: Keep semicolons at end of statements
- **singleQuote**: Use double quotes (Next.js convention)
- **tabWidth**: 2 spaces indentation
- **trailingComma**: Add trailing commas where valid in ES5 (arrays, objects)
- **printWidth**: Wrap lines at 100 characters

## IDE Integration

### VS Code

- Set up and .vscode/settings.json updated

### Other Editors

Most modern editors support Prettier. Configure to:

- Use `.prettierrc.json` configuration
- Format on save
- Set as default formatter for TypeScript/TSX files

## Class Organization Pattern

When writing Tailwind classes, follow this mental order (Prettier will enforce it):

```tsx
<Component
  // Layout
  className="// Spacing // Sizing // Border & Shadow // Colors & Background // Transforms // Responsive // Interactive m-4 flex h-screen w-full scale-100 flex-col items-center justify-center rounded-lg border border-zinc-800 bg-black p-6 text-white shadow-lg hover:bg-gray-900 focus:outline-none md:flex-row lg:p-8"
/>
```

## Common Class Groupings

### Button Classes

```tsx
"inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
```

### Card Classes

```tsx
"bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-lg p-6 hover:border-emerald-500/50";
```

### Form Input Classes

```tsx
"w-full px-4 py-3 rounded-lg border-2 border-zinc-700 bg-zinc-900/50 text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none";
```

### Heading Classes

```tsx
"text-4xl md:text-5xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent";
```

## Troubleshooting

### Classes Not Sorting

1. Ensure `.prettierrc.json` exists in project root
2. Verify `prettier-plugin-tailwindcss` is installed: `npm ls prettier-plugin-tailwindcss`
3. Restart IDE/editor
4. Run `npm run format:fix`

### Conflicts with ESLint

- Prettier and ESLint may disagree on formatting
- Always run `npm run format:fix` **after** `npm run lint:fix`
- Or configure ESLint to use Prettier rules (optional)

### Custom Tailwind Config Not Applied

- Verify `tailwindConfig` in `.prettierrc.json` points to correct file
- Use full path: `./tailwind.config.ts`
- Restart Prettier language server in IDE

## Next.js Image Component

This project uses `<Image />` from `next/image` for automatic image optimization. **Never use native `<img>` tags** — always use the Next.js Image component.

### Why Image Component Matters

- **Automatic Optimization**: Serves WebP format to supported browsers, PNG/JPEG to others
- **Responsive Sizing**: Automatically sizes images based on viewport and device pixel ratio
- **Lazy Loading**: Images load only when near the viewport
- **Prevents Layout Shift**: Requires explicit width/height to reserve space
- **Performance**: Reduces initial page load and improves Core Web Vitals
- **Built-in Blur Placeholder**: Optional placeholder while image loads

### Using the Image Component

#### Basic Usage (Explicit Dimensions)

For images with known fixed dimensions (avatars, icons, logos):

```tsx
import Image from "next/image";

export function UserAvatar() {
  return (
    <Image
      src="https://avatars.githubusercontent.com/u/12345678?v=4"
      alt="User profile picture"
      width={40}
      height={40}
      className="rounded-full"
    />
  );
}
```

**Props explained:**

- `src`: Image URL or local import
- `alt`: Descriptive alt text (required for accessibility)
- `width`: Intrinsic width in pixels (required unless using `fill`)
- `height`: Intrinsic height in pixels (required unless using `fill`)
- `className`: Tailwind classes (optional)

#### Responsive Images (Using `fill` Prop)

For full-width or responsive images:

```tsx
import Image from "next/image";
import { useState } from "react";

export function ResponsiveImage() {
  return (
    <div className="relative h-96 w-full">
      <Image
        src="/images/hero.jpg"
        alt="Hero image"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
```

**When using `fill`:**

- Parent must have `position: relative`
- Parent must have explicit `width` and `height`
- Image stretches to fill parent (use `object-fit` and `object-position` to control)
- `sizes` prop is recommended for optimization

#### With Blur Placeholder

For better UX while images load:

```tsx
import Image from "next/image";

export function LoadingPlaceholder() {
  return (
    <Image
      src="https://avatars.githubusercontent.com/u/12345678?v=4"
      alt="User avatar"
      width={40}
      height={40}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      className="rounded-full"
    />
  );
}
```

### Common Patterns

#### External URLs (GitHub Avatars, etc.)

```tsx
<Image
  src={prMetadata.user.avatar_url}
  alt={prMetadata.user.login}
  width={40}
  height={40}
  className="rounded-full"
/>
```

#### Local Images

```tsx
import profileImage from "@/public/profile.jpg";

<Image src={profileImage} alt="Profile picture" className="rounded-lg" />;
```

When importing, Next.js automatically provides width/height — you can omit them.

#### Hero Image (Full-Width)

```tsx
<div className="relative h-96 w-full md:h-screen">
  <Image src="/images/hero.jpg" alt="Hero background" fill priority className="object-cover" />
</div>
```

**`priority` prop:**

- Only use for above-the-fold images (hero, header)
- Disables lazy loading and prioritizes fetch
- Improves Largest Contentful Paint (LCP)
- Don't use for below-the-fold images

### Configuration

For external image domains, update `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
```

### Tailwind Integration

Use Tailwind classes with `className` prop:

```tsx
// ✅ Good - sorted by prettier-plugin-tailwindcss
<Image
  src={url}
  alt="description"
  width={100}
  height={100}
  className="rounded-lg border border-zinc-800 shadow-lg"
/>

// ❌ Bad - sizing via className (use width/height props instead)
<Image
  src={url}
  alt="description"
  className="h-10 w-10 rounded-full"
/>
```

### Best Practices

1. **Always provide `alt` text** for accessibility
2. **Use explicit `width`/`height`** for known dimensions
3. **Use `fill` + `sizes`** for responsive images
4. **Avoid `object-contain` without parent constraints**
5. **Use `priority` only for above-the-fold images**
6. **Don't scale images via `width`/`height` props** — use CSS classes
7. **Use local imports** when possible (auto width/height)
8. **Add to remotePatterns** for external domains

### Common Mistakes to Avoid

❌ **Using native `<img>`**

```tsx
// WRONG - Don't use this
<img src={url} alt="..." className="h-10 w-10" />
```

✅ **Use `<Image />`**

```tsx
// RIGHT - Use Image component
<Image src={url} alt="..." width={40} height={40} />
```

❌ **Missing required props**

```tsx
// WRONG - Missing width/height
<Image src={url} alt="..." />
```

✅ **All required props provided**

```tsx
// RIGHT - Explicit dimensions
<Image src={url} alt="..." width={40} height={40} />
// OR responsive with fill + parent sizing
<div className="relative h-64 w-full">
  <Image src={url} alt="..." fill />
</div>
```

### Performance Benefits

Next.js Image provides:

- **~32% bandwidth savings** via format optimization
- **~35% faster LCP** with responsive sizing
- **Layout stability** with explicit dimensions
- **Automatic CDN delivery** via Next.js Image Optimization API

### Troubleshooting

**Image not loading from external domain:**

```
Error: Invalid image src: "..."
Expected one of: https://example.com
Received: https://other-domain.com
```

Solution: Add domain to `next.config.ts` `remotePatterns`

**Layout shift or incorrect sizing:**

- Ensure `width` and `height` match actual image ratio
- For `fill` images, verify parent has explicit `width`/`height`

**Image stretched/distorted:**

- Add `object-cover` or `object-contain` to className
- Adjust parent container dimensions

## Best Practices

1. **Always format before committing**

   ```bash
   npm run format:fix && git add .
   ```

2. **Use IDE auto-format on save** to catch issues early

3. **Don't manually reorganize classes** - let Prettier handle it

4. **Review class changes in diffs** - easier to spot with sorted classes

5. **Keep className strings readable** - prefer sorted order over arbitrary positioning

## Resources

- [Tailwind CSS Official Docs](https://tailwindcss.com)
- [prettier-plugin-tailwindcss](https://github.com/tailwindlabs/prettier-plugin-tailwindcss)
- [Prettier Docs](https://prettier.io/docs/)
- [Class Ordering Explanation](https://tailwindcss.com/docs/class-name-order)

## Public Assets Organization

The `/public` directory stores static assets served directly by Next.js without processing. This includes images, fonts, icons, manifests, and other files.

### Directory Structure

```
public/
├── .gitkeep           (preserves directory in Git)
├── images/
│   ├── icons/
│   ├── logos/
│   └── ui/
├── fonts/
└── data/
```

### Using Public Assets

#### Importing Local Images

For images stored in `/public/images`, import and use with `<Image />`:

```tsx
import Image from "next/image";
import heroImage from "@/public/images/hero.jpg";

export function Hero() {
  return <Image src={heroImage} alt="Hero banner" className="w-full" />;
}
```

When importing static files, Next.js automatically provides `width` and `height` — you don't need to specify them.

#### Referencing Public URLs

For files that don't need optimization, reference by path:

```tsx
<link rel="stylesheet" href="/fonts/custom.css" />
<link rel="manifest" href="/manifest.json" />
<img src="/public/icon.png" alt="..." /> // ❌ Don't use <img> — use <Image>
```

#### SVG Icons

For small SVG icons, import as React components or images:

```tsx
// Option 1: Import as image
import Image from "next/image";
import checkIcon from "@/public/images/icons/check.svg";

<Image src={checkIcon} alt="Checkmark" width={24} height={24} />;

// Option 2: Import as component (if using svgr loader)
import { CheckIcon } from "@/public/images/icons/check.svg";

<CheckIcon className="h-6 w-6" />;
```

### Best Practices

1. **Organize by type**: Create subdirectories (`images/`, `fonts/`, etc.)
2. **Use descriptive names**: `hero-banner.jpg` not `image1.jpg`
3. **Optimize before uploading**: Compress images, minify SVGs
4. **Use `<Image />` for images**: Never use `<img>` for images from `/public`
5. **Version assets**: Add hash to cache-busting (`logo-v2.png`)
6. **Document external sources**: Comment if image is from external API

### What NOT to Store in Public

❌ **Environment secrets** - Use `.env.local`
❌ **Dynamic user uploads** - Use external storage (S3, Cloudinary)
❌ **Large files** (>5MB) - Use CDN or external services
❌ **Sensitive data** - Always use server-side only

### Adding New Assets

When adding new static assets:

1. Create appropriate subdirectory: `/public/images/`, `/public/icons/`, etc.
2. Follow naming convention: kebab-case (`hero-banner.jpg`)
3. Optimize before adding (compress images, minify SVGs)
4. Update STYLEGUIDE.md if creating new directory structure
5. Reference via `/path/to/file` or static import

### Example Directory

```
public/
├── .gitkeep
├── images/
│   ├── icons/
│   │   ├── check.svg
│   │   ├── github.svg
│   │   └── close.svg
│   ├── ui/
│   │   ├── hero-banner.jpg
│   │   └── logo.svg
│   └── logos/
│       └── pr-intelligence-logo.svg
└── fonts/
    ├── geist-sans.woff2
    └── geist-mono.woff2
```

### Performance Considerations

- **Images**: Use Next.js `<Image />` with proper dimensions
- **Fonts**: Use `next/font` for system fonts, preload custom fonts
- **SVGs**: Keep under 10KB, or convert to components for interactive icons
- **Cache**: Next.js caches public assets indefinitely by default

### Resources

- [Next.js Public Files](https://nextjs.org/docs/app/api-reference/file-conventions/public)
- [Image Optimization](https://nextjs.org/docs/app/api-reference/components/image)
- [Font Optimization](https://nextjs.org/docs/app/api-reference/next-config-js/optimizeFonts)
