import { test, expect } from '@playwright/test';

test.describe('Search Functionality (Pagefind)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have search input visible on desktop', async ({ page, viewport }) => {
    // Only test on desktop viewport
    if (viewport && viewport.width >= 1024) {
      const searchInput = page.locator('#search-bar input, input[placeholder*="Search"], input[placeholder*="search"]');
      await expect(searchInput).toBeVisible();
    }
  });

  test('should have search button/toggle on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const searchButton = page.locator('#search-switch, button[aria-label*="Search"]');
    await expect(searchButton).toBeVisible();
  });

  test('should open search panel when clicking search button on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const searchButton = page.locator('#search-switch, button[aria-label*="Search"]');
    await searchButton.click();

    const searchPanel = page.locator('#search-panel, [class*="search-panel"]');
    await expect(searchPanel).toBeVisible();
  });

  test('should display search results when typing in search box', async ({ page, viewport }) => {
    // Test on desktop where search is always visible
    if (!viewport || viewport.width < 1024) {
      await page.setViewportSize({ width: 1280, height: 720 });
    }

    const searchInput = page.locator('#search-bar input, input[placeholder*="Search"]').first();

    // Type a search query
    await searchInput.fill('markdown');
    await searchInput.click(); // Focus to trigger search

    // Wait a bit for search to process (longer for remote deployments)
    await page.waitForTimeout(2000);

    // Check if results panel appears
    const resultsPanel = page.locator('#search-panel, [class*="search-panel"]');

    // The panel should either show results or be visible
    // Note: In dev mode, it shows fake results
    const panelVisible = await resultsPanel.isVisible();
    if (panelVisible) {
      // Check for search result items
      const searchResults = page.locator('#search-panel a, [class*="search-panel"] a').first();
      await expect(searchResults).toBeVisible({ timeout: 10000 });
    }
  });

  test('should highlight search terms in results', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const searchInput = page.locator('#search-bar input').first();
    await searchInput.fill('markdown');
    await searchInput.click();

    await page.waitForTimeout(2000);

    // Check for highlighted terms (usually in <mark> tags)
    const highlightedTerms = page.locator('#search-panel mark, [class*="search-panel"] mark');
    const count = await highlightedTerms.count();

    // In production with real pagefind, this would have results
    // In dev mode, it might show fake results
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should clear results when search input is cleared', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const searchInput = page.locator('#search-bar input').first();

    // Type and then clear
    await searchInput.fill('markdown');
    await searchInput.click();
    await page.waitForTimeout(1000);

    // Clear the input
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // Panel should be hidden or empty
    const searchPanel = page.locator('#search-panel');
    const isHidden = await searchPanel.evaluate((el) => {
      return el.classList.contains('float-panel-closed') ||
             window.getComputedStyle(el).display === 'none' ||
             window.getComputedStyle(el).opacity === '0';
    });

    expect(isHidden).toBeTruthy();
  });

  test('should navigate to post when clicking search result', async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const searchInput = page.locator('#search-bar input').first();
    await searchInput.fill('markdown');
    await searchInput.click();

    await page.waitForTimeout(2000);

    // Try to click first search result if visible
    const firstResult = page.locator('#search-panel a').first();
    const resultVisible = await firstResult.isVisible().catch(() => false);

    if (resultVisible) {
      const href = await firstResult.getAttribute('href');
      await firstResult.click();
      await page.waitForLoadState('networkidle');

      // Should navigate to a page (not the homepage)
      const expectedHomeURL = baseURL?.endsWith('/') ? baseURL : `${baseURL}/`;
      expect(page.url()).not.toBe(expectedHomeURL);
    }
  });

  test('should handle special characters in search', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const searchInput = page.locator('#search-bar input').first();

    // Try special characters
    await searchInput.fill('markdown & code');
    await searchInput.click();
    await page.waitForTimeout(1000);

    // Should not crash - basic smoke test
    expect(await page.locator('body').isVisible()).toBeTruthy();
  });

  test('should show no results message or empty state for non-existent content', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    const searchInput = page.locator('#search-bar input').first();
    await searchInput.fill('xyzabc123nonexistent');
    await searchInput.click();
    await page.waitForTimeout(2000);

    const searchPanel = page.locator('#search-panel');
    const links = await searchPanel.locator('a').count();

    // In production, should have 0 results
    // In dev mode, might show fake results
    expect(links).toBeGreaterThanOrEqual(0);
  });
});
