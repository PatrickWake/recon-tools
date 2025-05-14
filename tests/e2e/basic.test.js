import { test, expect } from '@playwright/test';

test('basic functionality', async ({ page }) => {
  await page.goto('/');

  // Check title
  await expect(page).toHaveTitle(/Recon Tools/);

  // Check if all tool buttons are present
  await expect(page.locator('.tool-btn')).toHaveCount(9);

  // Test CMS detection
  await page.click('button[data-tool="cms-detect"]');
  await page.fill('#targetUrl', 'https://wordpress.org');
  await page.click('button[type="submit"]');

  // Wait for results
  await expect(page.locator('#results')).toBeVisible();

  // Check if results contain WordPress detection
  const results = await page.locator('#results-content pre').textContent();
  expect(results).toContain('CMS Detection Results');
});
