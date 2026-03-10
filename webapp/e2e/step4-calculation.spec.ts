import { test, expect } from '@playwright/test';

test.describe('Step4 - 縮尺比率計算UI', () => {
  // Step4はデモフローのStep1からアクセスするため、
  // デモページのStep1 UIの存在確認を行う
  test('デモページにアクセスできる', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('text=図面PDFをアップロード')).toBeVisible();
  });

  test('Step1にAI解析を開始するボタンが存在する', async ({ page }) => {
    await page.goto('/demo');
    // ファイル未選択状態ではdisabledになっている
    const analyzeBtn = page.locator('button', { hasText: 'AI解析を開始' });
    await expect(analyzeBtn).toBeVisible();
    await expect(analyzeBtn).toBeDisabled();
  });

  test('サンプル図面ボタンが存在する', async ({ page }) => {
    await page.goto('/demo');
    const sampleBtn = page.locator('button', { hasText: 'サンプル図面で試す' });
    await expect(sampleBtn).toBeVisible();
    await expect(sampleBtn).toBeEnabled();
  });
});
