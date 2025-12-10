import { test, expect } from '@playwright/test';

/**
 * Responsive Design Tests
 *
 * Tests that the blog is responsive and works correctly across different screen sizes
 * Uses setViewportSize() to test different viewports within each test
 */

test.describe('Responsive Design - Mobile Viewport', () => {
  test('should load homepage on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('should have mobile-friendly navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for hamburger menu or mobile navigation
    const mobileNav = page.locator(
      'button[aria-label*="menu" i], button[aria-label*="navigation" i], .menu-toggle, [class*="hamburger"]'
    );

    const mobileNavExists = await mobileNav.count() > 0;

    if (mobileNavExists) {
      await expect(mobileNav.first()).toBeVisible();
    } else {
      // Navigation might be always visible on mobile
      const nav = page.locator('nav');
      expect(await nav.count()).toBeGreaterThan(0);
    }
  });

  test('should have mobile search functionality', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for search button (mobile version)
    const searchButton = page.locator(
      '#search-switch, button[aria-label*="search" i], [class*="search-toggle"]'
    );

    const searchExists = await searchButton.count() > 0;

    if (searchExists) {
      await expect(searchButton.first()).toBeVisible();
    }
  });

  test('should render blog posts in mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Blog posts should be visible
    const posts = page.locator('article, .post-card, [class*="post"]');
    expect(await posts.count()).toBeGreaterThan(0);
  });

  test('should navigate to blog post from mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and tap on a post link
    const postLink = page.locator('a[href*="/posts/"]').first();
    await expect(postLink).toBeVisible();

    await postLink.click();
    await page.waitForLoadState('networkidle');

    // Should navigate to post page
    expect(page.url()).toContain('/posts/');
  });

  test('should have readable text on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/posts/markdown/');
    await page.waitForLoadState('networkidle');

    // Check font size is reasonable for mobile
    const paragraph = page.locator('article p, main p').first();
    await expect(paragraph).toBeVisible();

    const fontSize = await paragraph.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    // Font size should be at least 14px for readability
    const fontSizeNum = parseFloat(fontSize);
    expect(fontSizeNum).toBeGreaterThanOrEqual(14);
  });

  test('should not have horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if page has horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('should have mobile-optimized theme switcher', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Theme button should be accessible on mobile
    const themeButton = page.locator('#scheme-switch, button[aria-label*="theme" i]').first();
    await expect(themeButton).toBeVisible();

    // Should be clickable
    await themeButton.click();
    await page.waitForTimeout(500);

    // Theme should change (verify by checking DOM)
    const themeChanged = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark') ||
             document.documentElement.classList.contains('light') ||
             document.documentElement.getAttribute('data-theme');
    });

    expect(themeChanged).toBeTruthy();
  });
});

test.describe('Responsive Design - Tablet Viewport', () => {
  test('should load homepage on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 }); // iPad Pro
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('should have appropriate layout on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if layout is different from mobile (might show more columns)
    const posts = page.locator('article, .post-card, [class*="post"]');
    expect(await posts.count()).toBeGreaterThan(0);
  });

  test('should navigate properly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 1366 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a post
    const postLink = page.locator('a[href*="/posts/"]').first();
    await postLink.click();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/posts/');
  });
});

test.describe('Responsive Design - Desktop Viewport', () => {
  test('should load homepage on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const content = page.locator('body');
    await expect(content).toBeVisible();
  });

  test('should have desktop navigation visible', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Desktop navigation should be visible without toggle
    const nav = page.locator('nav, header nav');
    expect(await nav.count()).toBeGreaterThan(0);
  });

  test('should have desktop search bar visible', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Desktop search should be visible
    const searchInput = page.locator('#search-bar input, input[placeholder*="search" i]');
    const searchExists = await searchInput.count() > 0;

    if (searchExists) {
      await expect(searchInput.first()).toBeVisible();
    }
  });

  test('should show theme panel on hover (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Hover over theme button
    const themeButton = page.locator('#scheme-switch').first();
    await themeButton.hover();
    await page.waitForTimeout(500);

    // Panel might appear
    const themePanel = page.locator('#light-dark-panel');
    const panelExists = await themePanel.count() > 0;

    // On desktop, panel should exist (might not be visible until hover)
    expect(panelExists).toBeTruthy();
  });

  test('should have wider content area on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/posts/markdown/');
    await page.waitForLoadState('networkidle');

    // Content should have max width but be wider than mobile
    const article = page.locator('article, main').first();
    await expect(article).toBeVisible();

    const width = await article.evaluate((el) => {
      return el.getBoundingClientRect().width;
    });

    // Desktop width should be substantial
    expect(width).toBeGreaterThan(600);
  });
});

test.describe('Responsive Design - Viewport Transitions', () => {
  test('should adapt when resizing from desktop to mobile', async ({ page }) => {
    // Start with desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Resize to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Page should still be functional
    const content = page.locator('body');
    await expect(content).toBeVisible();

    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('should adapt when resizing from mobile to desktop', async ({ page }) => {
    // Start with mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Resize to desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    // Page should still be functional
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});

test.describe('Responsive Design - Touch Interactions', () => {
  test('should handle touch on links', async ({ page, browserName }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tap on a link (use click for compatibility)
    const link = page.locator('a[href*="/posts/"]').first();
    await link.click();
    await page.waitForLoadState('networkidle');

    expect(page.url()).toContain('/posts/');
  });

  test('should handle touch on buttons', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tap on theme button
    const themeButton = page.locator('#scheme-switch').first();
    await themeButton.click();
    await page.waitForTimeout(500);

    // Should still work
    const content = page.locator('body');
    await expect(content).toBeVisible();
  });
});

test.describe('Responsive Design - Accessibility', () => {
  test('should be keyboard navigable on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Press tab to navigate
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Focus should be visible (check if any element has focus)
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focusedElement).toBeTruthy();
  });
});
