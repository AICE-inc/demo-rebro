import { test, expect } from '@playwright/test';

test.describe('トップページ', () => {
  test('3つのデモカードが表示される', async ({ page }) => {
    await page.goto('/');

    // ページタイトルの確認
    await expect(page.locator('text=Rebro AI デモ')).toBeVisible({ timeout: 10000 });

    // 3つのデモカードの確認（exact: true で部分一致を避ける）
    await expect(page.getByText('縮尺合わせ', { exact: true })).toBeVisible();
    await expect(page.getByText('AI配管作図支援', { exact: true })).toBeVisible();
    await expect(page.getByText('見積書生成', { exact: true })).toBeVisible();

    // DEMOラベルの確認
    await expect(page.locator('text=DEMO 01')).toBeVisible();
    await expect(page.locator('text=DEMO 02')).toBeVisible();
    await expect(page.locator('text=DEMO 03')).toBeVisible();
  });

  test('デモ①へのリンクが機能する', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('text=デモを開始する');
    await buttons.nth(0).click();
    await expect(page).toHaveURL(/\/scale/);
  });

  test('デモ②へのリンクが機能する', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('text=デモを開始する');
    await buttons.nth(1).click();
    await expect(page).toHaveURL(/\/guide/);
  });

  test('デモ③へのリンクが機能する', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('text=デモを開始する');
    await buttons.nth(2).click();
    await expect(page).toHaveURL(/\/estimate/);
  });
});
