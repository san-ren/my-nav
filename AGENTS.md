# AGENTS.md - Agentic Coding Guidelines

This file provides context for AI agents operating in this repository.

---

## 1. Build & Development Commands

### Core Commands
```bash
# Start development server
npm run dev              # Runs on http://localhost:4321

# Type check (Astro)
npm run check

# Build for production (GitHub Pages)
npm run build            # Uses DEPLOY_TARGET=root
npm run build:gh        # Uses DEPLOY_TARGET=github

# Preview production build locally
npm run preview

# Run Astro CLI
npm run astro [command]
```

### Running Single Test/Diagnostic
- No dedicated test framework is configured (no Vitest/Jest)
- Use `npm run check` for TypeScript validation
- Use `npx astro check` for Astro-specific type checking
- For manual testing: use `npm run dev` and access the site

---

## 2. Project Structure

```
my-nav/
├── src/
│   ├── components/     # UI components (Astro + React)
│   │   ├── SiteCard/   # Website link cards
│   │   ├── SearchModal.jsx
│   │   ├── Sidebar/
│   │   ├── ThemePicker/
│   │   └── keystatic/ # Admin toolbox components
│   ├── content/        # Data (JSON + MDX, managed by Keystatic)
│   │   ├── nav-groups/ # Navigation groupings
│   │   ├── nav-pages/  # Sidebar pages
│   │   ├── changelog/
│   │   └── guides/
│   ├── layouts/        # Astro layouts
│   ├── pages/          # Astro routes
│   ├── styles/         # CSS + animations
│   └── utils/          # Helper functions
├── public/             # Static assets
├── astro.config.mjs
├── keystatic.config.tsx
└── tailwind.config.mjs
```

---

## 3. Code Style Guidelines

### TypeScript Configuration
- `tsconfig.json` extends `astro/tsconfigs/strict`
- **Strict mode is disabled** (`strict: false`)
- Type annotations are optional but encouraged for complex logic
- Use `any` sparingly; prefer explicit types when possible

### Astro Components
- Use frontmatter `---` for server-side logic
- Props defined in component frontmatter
- Client-side interactivity via `<script>` tags or `client:*` directives
- Example:
  ```astro
  ---
  import Layout from '../layouts/Layout.astro';
  const { title } = Astro.props;
  ---
  <Layout title={title}>
    <slot />
  </Layout>
  ```

### React Components
- Use `.jsx` or `.tsx` extension
- Prefer functional components with hooks
- Import React only when needed (JSX transform handles most cases)
- Example:
  ```jsx
  import { useState, useEffect } from 'react';
  import { Search, X } from 'lucide-react';

  export default function SearchModal() {
    const [query, setQuery] = useState('');
    // ...
  }
  ```

### Imports & Ordering
1. External libraries (React, Astro, lucide-react)
2. Internal components
3. Utils/helpers
4. Styles

```astro
---
// 1. Astro built-ins
import { ClientRouter } from 'astro:transitions';

// 2. External libraries
import { marked } from 'marked';
import { clsx, type ClassValue } from 'clsx';

// 3. Internal components
import Layout from '../layouts/Layout.astro';
import SiteCard from '../components/SiteCard/index.astro';

// 4. Utils
import { sortResourcesByStatus } from '../utils/resourceSort';

// 5. Styles
import './site-card.css';
---
```

### CSS & Styling
- **Tailwind CSS** for utility classes
- Custom CSS in `.css` files for component-specific styles
- Use `cn()` utility (clsx + tailwind-merge) for class merging:
  ```javascript
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';
  
  const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
  ```

### File Naming
- Astro components: `PascalCase.astro` (e.g., `SiteCard.astro`, `Layout.astro`)
- React components: `PascalCase.jsx` or `PascalCase.tsx`
- Utils/helpers: `camelCase.ts`
- CSS files: `kebab-case.css`

---

## 4. Key Patterns & Conventions

### View Transitions
- Use `ClientRouter` from `astro:transitions` for SPA-like navigation
- Add `transition:name` attributes for element morphing between pages

### Client Directives
- `client:idle` - Load when browser is idle
- `client:load` - Load immediately
- `client:visible` - Load when element enters viewport

### State Management
- Local state via React hooks (`useState`, `useEffect`)
- Global UI state via `window` object or custom events
- User preferences stored in `localStorage`

### Error Handling
- Wrap async operations in try-catch
- Use console.error for debugging (not throw)
- Toast notifications for user-facing errors:
  ```javascript
  if (window.toast) {
    window.toast.error('操作失败，请重试');
  }
  ```

---

## 5. Testing & Verification

### Before Submitting Changes
1. Run `npm run check` to validate types
2. Run `npm run build` to ensure production build succeeds
3. Test locally with `npm run dev`

### Common Issues
- **Missing imports**: Ensure all components are imported
- **Hydration errors**: Use correct `client:*` directives
- **Type errors**: Check tsconfig allows implicit any (project uses loose type checking)

---

## 6. Useful Utilities

### Toast Notifications
```javascript
window.toast.success('操作成功');
window.toast.error('发生错误');
window.toast.info('提示信息');
window.toast.warning('警告信息');
```

### Class Merging
```javascript
const cn = (...inputs) => twMerge(clsx(inputs));
// Usage: cn('base-class', condition && 'conditional-class')
```

---

## 7. External Resources

- [Astro Docs](https://docs.astro.build)
- [Tailwind CSS](https://tailwindcss.com)
- [React Docs](https://react.dev)
- [Lucide Icons](https://lucide.dev)
