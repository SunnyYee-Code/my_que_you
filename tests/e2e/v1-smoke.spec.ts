import { test, expect } from '@playwright/test';

test.describe('V1 smoke skeleton', () => {
  test('home page shows brand and core entry', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/雀友聚|约局|牌友/i).first()).toBeVisible();
  });

  test('login page keeps agreement gate visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('checkbox')).toBeVisible();
  });
});
