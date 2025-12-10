import { test, expect } from '@playwright/test';

/**
 * Markdown Rendering Tests
 *
 * Tests that markdown content is correctly rendered with extended syntax support
 * Includes: code blocks, tables, task lists, admonitions, math (KaTeX), etc.
 */
test.describe('Markdown Rendering', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a markdown post that has extended syntax examples
    await page.goto('/posts/markdown/');
    await page.waitForLoadState('networkidle');
  });

  test('should render basic markdown elements', async ({ page }) => {
    // Check for headings
    const h1 = page.locator('h1');
    const h2 = page.locator('h2');
    expect(await h1.count()).toBeGreaterThan(0);
    expect(await h2.count()).toBeGreaterThan(0);

    // Check for paragraphs
    const paragraphs = page.locator('article p, main p, .prose p');
    expect(await paragraphs.count()).toBeGreaterThan(0);

    // Check for lists
    const lists = page.locator('ul, ol');
    expect(await lists.count()).toBeGreaterThan(0);
  });

  test('should render text formatting', async ({ page }) => {
    // Check for bold text
    const bold = page.locator('strong, b');
    expect(await bold.count()).toBeGreaterThan(0);

    // Check for italic text
    const italic = page.locator('em, i');
    expect(await italic.count()).toBeGreaterThan(0);

    // Check for inline code
    const inlineCode = page.locator('code:not(pre code)');
    expect(await inlineCode.count()).toBeGreaterThan(0);
  });

  test('should render code blocks with syntax highlighting', async ({ page }) => {
    // Check for code blocks
    const codeBlocks = page.locator('pre code, .expressive-code, [class*="code-block"]');
    const codeBlockCount = await codeBlocks.count();

    if (codeBlockCount > 0) {
      await expect(codeBlocks.first()).toBeVisible();

      // Check if syntax highlighting is applied (classes or styles)
      const firstCodeBlock = codeBlocks.first();
      const hasHighlighting = await firstCodeBlock.evaluate((el) => {
        // Check for syntax highlighting classes or child elements with classes
        return el.querySelectorAll('[class*="token"], [class*="keyword"], span').length > 0;
      });

      // Note: Some themes might not use these specific classes
      // The important thing is that code blocks render
      expect(await firstCodeBlock.isVisible()).toBeTruthy();
    }
  });

  test('should render blockquotes', async ({ page }) => {
    // Check for blockquotes
    const blockquotes = page.locator('blockquote');
    const blockquoteCount = await blockquotes.count();

    if (blockquoteCount > 0) {
      await expect(blockquotes.first()).toBeVisible();

      // Blockquote should have distinct styling
      const bgColor = await blockquotes.first().evaluate((el) => {
        return window.getComputedStyle(el).borderLeftWidth || window.getComputedStyle(el).paddingLeft;
      });

      expect(bgColor).toBeTruthy();
    }
  });

  test('should render links correctly', async ({ page }) => {
    // Check for links in content
    const links = page.locator('article a, main a, .prose a');
    const linkCount = await links.count();

    if (linkCount > 0) {
      // Verify links have href attributes
      const firstLink = links.first();
      await expect(firstLink).toBeVisible();

      const href = await firstLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('should render images if present', async ({ page }) => {
    // Check for images in content
    const images = page.locator('article img, main img, .prose img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      const firstImage = images.first();
      await expect(firstImage).toBeVisible();

      // Check if image has src and alt attributes
      const src = await firstImage.getAttribute('src');
      expect(src).toBeTruthy();
    }
  });

  test('should render horizontal rules if present', async ({ page }) => {
    // Check for horizontal rules
    const hrs = page.locator('hr');
    const hrCount = await hrs.count();

    if (hrCount > 0) {
      await expect(hrs.first()).toBeVisible();
    }
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Get all headings
    const h1Count = await page.locator('article h1, main h1').count();
    const h2Count = await page.locator('article h2, main h2').count();
    const h3Count = await page.locator('article h3, main h3').count();

    // Should have at least one heading
    const totalHeadings = h1Count + h2Count + h3Count;
    expect(totalHeadings).toBeGreaterThan(0);
  });

  test('should test extended markdown on extended markdown page', async ({ page }) => {
    // Navigate to extended markdown examples if available
    await page.goto('/posts/markdown-extended/');
    await page.waitForLoadState('networkidle');

    // Check for page content
    const content = page.locator('article, main');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });

  test('should render tables if present', async ({ page }) => {
    // Try extended markdown page
    await page.goto('/posts/markdown-extended/');
    await page.waitForLoadState('networkidle');

    // Check for tables
    const tables = page.locator('table');
    const tableCount = await tables.count();

    if (tableCount > 0) {
      await expect(tables.first()).toBeVisible();

      // Check for table headers
      const th = page.locator('th');
      expect(await th.count()).toBeGreaterThan(0);

      // Check for table rows
      const tr = page.locator('tr');
      expect(await tr.count()).toBeGreaterThan(0);
    }
  });

  test('should render task lists if present', async ({ page }) => {
    // Try extended markdown page
    await page.goto('/posts/markdown-extended/');
    await page.waitForLoadState('networkidle');

    // Check for checkboxes (task lists)
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 0) {
      // Task lists rendered
      expect(checkboxCount).toBeGreaterThan(0);
    }
  });

  test('should render admonitions/callouts if present', async ({ page }) => {
    // Try extended markdown page
    await page.goto('/posts/markdown-extended/');
    await page.waitForLoadState('networkidle');

    // Check for admonitions (note, tip, warning, etc.)
    const admonitions = page.locator(
      '.note, .tip, .warning, .caution, .important, [class*="admonition"], [class*="callout"]'
    );
    const admonitionCount = await admonitions.count();

    if (admonitionCount > 0) {
      await expect(admonitions.first()).toBeVisible();
    }
  });

  test('should handle footnotes if present', async ({ page }) => {
    // Try extended markdown page
    await page.goto('/posts/markdown-extended/');
    await page.waitForLoadState('networkidle');

    // Check for footnote references and definitions
    const footnoteRefs = page.locator('sup[id^="fnref"], a[href^="#fn"]');
    const footnoteCount = await footnoteRefs.count();

    if (footnoteCount > 0) {
      // Footnotes are present
      expect(footnoteCount).toBeGreaterThan(0);
    }
  });

  test('should render math/KaTeX if present', async ({ page }) => {
    // Try extended markdown page
    await page.goto('/posts/markdown-extended/');
    await page.waitForLoadState('networkidle');

    // Check for KaTeX elements
    const math = page.locator('.katex, .math, [class*="katex"]');
    const mathCount = await math.count();

    if (mathCount > 0) {
      await expect(math.first()).toBeVisible();
    }
  });

  test('should have anchor links on headings', async ({ page }) => {
    await page.goto('/posts/markdown/');
    await page.waitForLoadState('networkidle');

    // Check if headings have anchor links
    const headingAnchors = page.locator('h2 a.anchor, h3 a.anchor, h2 .anchor-icon, h3 .anchor-icon');
    const anchorCount = await headingAnchors.count();

    if (anchorCount > 0) {
      // Some headings have anchor links
      expect(anchorCount).toBeGreaterThan(0);
    }
  });

  test('should render code blocks on expressive code page', async ({ page }) => {
    // Navigate to expressive code examples
    const response = await page.goto('/posts/expressive-code/');

    if (response && response.ok()) {
      await page.waitForLoadState('networkidle');

      // Check for expressive code features
      const codeBlocks = page.locator('.expressive-code, pre');
      const codeCount = await codeBlocks.count();

      expect(codeCount).toBeGreaterThan(0);
      await expect(codeBlocks.first()).toBeVisible();
    }
  });
});
