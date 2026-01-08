import { test, expect } from '@playwright/test';

test.describe('Blog Post Listing and Navigation', () => {
  test('should display blog posts on homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check if the page has blog posts
    const postElements = page.locator('article, .post-card, [class*="post"]').first();
    await expect(postElements).toBeVisible({ timeout: 15000 });

    // Check for post titles - they should be links
    const postTitles = page.locator('a:has-text("Markdown"), a:has-text("Guide"), a:has-text("Post")');
    await expect(postTitles.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to a blog post', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find and click the first blog post link
    // Look for links in articles or with certain patterns
    const firstPostLink = page.locator('article a, a[href*="/posts/"]').first();
    await expect(firstPostLink).toBeVisible({ timeout: 15000 });

    // Get the href before clicking
    const href = await firstPostLink.getAttribute('href');

    await firstPostLink.click();
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Verify we're on a post page
    expect(page.url()).toContain('/posts/');

    // Check for post content elements
    const postContent = page.locator('article, main, .prose, [class*="content"]');
    await expect(postContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should display pagination if available', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if pagination exists (might not exist if there are few posts)
    const paginationExists = await page.locator('nav[aria-label*="pagination"], .pagination, a:has-text("Next"), a:has-text("Previous")').count() > 0;

    if (paginationExists) {
      const pagination = page.locator('nav[aria-label*="pagination"], .pagination').first();
      await expect(pagination).toBeVisible();
    }
  });

  test('should navigate back from post to listing', async ({ page, baseURL }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a post
    const firstPostLink = page.locator('article a, a[href*="/posts/"]').first();
    await firstPostLink.click();
    await page.waitForLoadState('networkidle');

    // Navigate back using browser back button
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Should be back on the home page
    const expectedURL = baseURL?.endsWith('/') ? baseURL : `${baseURL}/`;
    expect(page.url()).toBe(expectedURL);
  });

  test('should display post metadata', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to a post
    const postLink = page.locator('a[href*="/posts/"]').first();
    await postLink.click();
    await page.waitForLoadState('networkidle');

    // Look for common metadata elements
    // Date, reading time, tags, categories, etc.
    const hasMetadata = await page.locator('time, [datetime], .date, .reading-time, .tag, .category').count() > 0;
    expect(hasMetadata).toBeTruthy();
  });

  test('should have archive page with posts', async ({ page }) => {
    await page.goto('/archive/');
    await page.waitForLoadState('networkidle');

    // Check for archive content
    const archiveContent = page.locator('article, main');
    await expect(archiveContent.first()).toBeVisible();

    // Should have links to posts
    const postLinks = page.locator('a[href*="/posts/"]');
    expect(await postLinks.count()).toBeGreaterThan(0);
  });

  test('should have about page', async ({ page }) => {
    await page.goto('/about/');
    await page.waitForLoadState('networkidle');

    // Check for about content
    const aboutContent = page.locator('article, main, .prose');
    await expect(aboutContent.first()).toBeVisible();
  });
});
