import { test, expect } from '@playwright/test';

test.describe('V1 smoke skeleton', () => {
  test('home page shows brand and core entry', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/雀友聚|约局|牌友/i).first()).toBeVisible();
  });

  test('login page keeps agreement gate visible', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('checkbox')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录' }).last()).toBeDisabled();
  });

  test('login page shows register entry text', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('注册').first()).toBeVisible();
    await expect(page.getByText(/邮箱验证|登录/).first()).toBeVisible();
  });

  test('unknown route shows 404 fallback', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText(/Page not found/i)).toBeVisible();
  });
});
