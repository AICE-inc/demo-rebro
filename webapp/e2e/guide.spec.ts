import { test, expect } from '@playwright/test';

test.describe('デモ② AI配管作図支援 (/guide)', () => {
  test('ページが表示される', async ({ page }) => {
    await page.goto('/guide');
    await expect(page.locator('text=AI配管作図支援')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=DEMO 02')).toBeVisible();
  });

  test('Step1: 図面アップロード画面が表示される', async ({ page }) => {
    await page.goto('/guide');
    await expect(page.locator('text=配管図面をアップロード')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="sample-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="next-button"]')).toBeDisabled();
  });

  test('Step1: サンプル図面を選択するとプレビューが表示され次へボタンが有効になる', async ({ page }) => {
    await page.goto('/guide');

    await page.click('[data-testid="sample-button"]');

    await expect(page.locator('img[alt="図面プレビュー"]')).toBeVisible({ timeout: 30000 });
    await expect(page.locator('[data-testid="next-button"]')).toBeEnabled({ timeout: 30000 });
  });

  test('サンプル図面→解析→チャットの一連フロー', async ({ page }) => {
    await page.goto('/guide');

    // Step1: サンプル図面を選択
    await page.click('[data-testid="sample-button"]');
    await expect(page.locator('img[alt="図面プレビュー"]')).toBeVisible({ timeout: 30000 });

    // AI解析を開始
    await page.click('[data-testid="next-button"]');

    // Step2: 解析画面が表示される
    await expect(page.locator('text=AIが図面を解析中')).toBeVisible({ timeout: 10000 });

    // Step3: チャット画面へ遷移（解析完了後、最大60秒待機）
    await expect(page.locator('textarea')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('button', { hasText: '送信' })).toBeVisible();
    await expect(page.locator('text=図面を選び直す')).toBeVisible();
  });

  test('チャット画面: 送信ボタンは入力がないと無効', async ({ page }) => {
    await page.goto('/guide');

    await page.click('[data-testid="sample-button"]');
    await expect(page.locator('[data-testid="next-button"]')).toBeEnabled({ timeout: 30000 });
    await page.click('[data-testid="next-button"]');
    await expect(page.locator('textarea')).toBeVisible({ timeout: 60000 });

    const sendButton = page.locator('button', { hasText: '送信' });
    await expect(sendButton).toBeDisabled();
  });

  test('トップへ戻るリンクが機能する', async ({ page }) => {
    await page.goto('/guide');
    await page.click('text=トップへ戻る');
    await expect(page).toHaveURL('/');
  });
});
