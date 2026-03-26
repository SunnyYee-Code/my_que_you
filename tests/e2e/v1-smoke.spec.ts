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

  test('community page shows discovery controls', async ({ page }) => {
    await page.goto('/community');
    await expect(page.getByRole('combobox').nth(0)).toBeVisible();
    await expect(page.getByRole('combobox').nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: '全部' })).toBeVisible();
    await expect(page.getByRole('button', { name: '招募中' })).toBeVisible();
  });

  test('community page lets user open distance filter options', async ({ page }) => {
    await page.goto('/community');
    await page.getByRole('combobox').nth(0).click();
    await expect(page.getByRole('option', { name: '1km内' })).toBeVisible();
    await expect(page.getByRole('option', { name: '3km内' })).toBeVisible();
  });

  test('protected create route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/group/create');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByPlaceholder('请输入手机号、用户名或邮箱')).toBeVisible();
  });

  test('protected review route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/group/group-1/review');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByPlaceholder('请输入手机号、用户名或邮箱')).toBeVisible();
  });

  test('protected admin route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByPlaceholder('请输入手机号、用户名或邮箱')).toBeVisible();
  });

  test('unknown route shows 404 fallback', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText(/Page not found/i)).toBeVisible();
  });
});
