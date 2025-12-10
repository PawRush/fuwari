# Fuwari Test Suite

Playwright end-to-end tests for the Fuwari Astro blog template.

## Quick Start

```bash
# Build the site (required for search tests)
pnpm build

# Run all tests
pnpm exec playwright test

# Run tests in interactive UI mode
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test tests/blog-listing-navigation.spec.ts
```

## Test Files

### `blog-listing-navigation.spec.ts`
Tests blog post listing, navigation, pagination, and archive pages.

**Key tests:**
- Homepage blog post display
- Post navigation
- Archive and about pages
- Browser back button
- Post metadata display

### `search-functionality.spec.ts`
Tests Pagefind search integration on desktop and mobile.

**Key tests:**
- Search bar visibility
- Search results accuracy
- Mobile search panel
- Search result navigation
- Keyboard shortcuts

**Note:** Requires production build (`pnpm build`) to work.

### `theme-switching.spec.ts`
Tests light/dark/auto theme switching functionality.

**Key tests:**
- Theme toggle button
- Light, dark, and auto modes
- Theme persistence (localStorage)
- Theme after navigation
- Theme panel UI

### `markdown-rendering.spec.ts`
Tests markdown content rendering with extended syntax support.

**Key tests:**
- Basic markdown (headings, lists, text formatting)
- Code blocks with syntax highlighting
- Extended markdown (tables, task lists, footnotes)
- Admonitions/callouts
- Math/KaTeX rendering
- Heading anchor links

### `responsive-design.spec.ts`
Tests responsive behavior across different devices and viewports.

**Key tests:**
- Mobile layout (iPhone, Pixel)
- Tablet layout (iPad)
- Desktop layout (1920x1080)
- Mobile menu/hamburger
- Touch interactions
- Viewport transitions
- No horizontal scroll

## Test Configuration

Configuration is in `/playwright.config.ts`:

- **Browsers:** Chromium, Firefox, WebKit
- **Mobile Devices:** iPhone 12, Pixel 5
- **Base URL:** http://localhost:4321
- **Web Server:** Runs `pnpm preview` automatically
- **Retries:** 2 on CI, 0 locally
- **Artifacts:** Screenshots and videos on failure

## Running Tests

### All tests
```bash
pnpm exec playwright test
```

### Specific browser
```bash
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
```

### Mobile tests
```bash
pnpm exec playwright test --project="Mobile Chrome"
pnpm exec playwright test --project="Mobile Safari"
```

### Headed mode (see browser)
```bash
pnpm exec playwright test --headed
```

### Debug mode
```bash
pnpm exec playwright test --debug
```

### UI mode (interactive)
```bash
pnpm exec playwright test --ui
```

### Generate report
```bash
pnpm exec playwright show-report
```

## Prerequisites

1. **Build the site:**
   ```bash
   pnpm build
   ```
   This generates the Pagefind search index needed for search tests.

2. **Install Playwright browsers:**
   ```bash
   pnpm exec playwright install
   ```

## Test Structure

Each test file follows this structure:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
  });

  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Test assertions
  });
});
```

## Best Practices

1. **Always build before testing:** Search requires production build
2. **Use waitForLoadState:** Ensure page is fully loaded
3. **Clear localStorage:** Reset state between tests
4. **Use descriptive names:** Make failures easy to diagnose
5. **Check test artifacts:** Review screenshots/videos on failure

## Common Issues

### Search tests failing
```bash
pnpm build  # Rebuild to generate Pagefind index
```

### Port already in use
Kill process on port 4321 or enable `reuseExistingServer` in config.

### Browser not installed
```bash
pnpm exec playwright install
```

### Timeout errors
- Increase timeout in test
- Check if server is starting properly
- Use `page.waitForLoadState('networkidle')`

## Documentation

See [TESTING.md](../TESTING.md) for comprehensive documentation.

## Contributing

When adding new tests:

1. Create descriptive test names
2. Add comments for complex logic
3. Follow existing patterns
4. Update this README
5. Run tests to verify: `pnpm exec playwright test`

## Test Coverage

- **Blog Navigation:** 7 tests
- **Search Functionality:** 8 tests
- **Theme Switching:** 8 tests
- **Markdown Rendering:** 17 tests
- **Responsive Design:** 20+ tests

**Total:** 60+ tests × 5 browsers/devices = 300+ test executions

---

For detailed information, see [TESTING.md](../TESTING.md)
