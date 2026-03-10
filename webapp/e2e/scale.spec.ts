import { test, expect } from '@playwright/test';

test.describe('デモ① 縮尺合わせ (/scale)', () => {
  test('ページが表示される', async ({ page }) => {
    await page.goto('/scale');
    // Step1のアップロード UI が表示されていることを確認
    await expect(page.locator('text=図面PDFをアップロード')).toBeVisible({ timeout: 10000 });
  });

  test('ステップインジケーターにAI解析ラベルが表示される', async ({ page }) => {
    await page.goto('/scale');
    // ステップ2「AI解析」ラベルが存在することを確認
    await expect(page.getByText('AI解析', { exact: true })).toBeVisible({ timeout: 10000 });
  });

  test('サンプルPDF読み込みボタンが存在する', async ({ page }) => {
    await page.goto('/scale');
    // サンプルボタンの存在を確認（実際のテキスト「サンプル図面で試す」）
    const sampleButton = page.locator('button', { hasText: 'サンプル図面で試す' });
    await expect(sampleButton).toBeVisible({ timeout: 10000 });
  });

  test('ステップインジケーターが4ステップ表示される', async ({ page }) => {
    await page.goto('/scale');
    await expect(page.getByText('アップロード', { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=寸法選択')).toBeVisible();
    await expect(page.getByText('結果', { exact: true })).toBeVisible();
  });

  test('ファイルアップロードエリアが存在する', async ({ page }) => {
    await page.goto('/scale');
    await expect(page.locator('text=クリックまたはドラッグ')).toBeVisible({ timeout: 10000 });
  });

  test('AI解析ボタンが初期状態でdisabledになっている', async ({ page }) => {
    await page.goto('/scale');
    const analyzeBtn = page.locator('button', { hasText: 'AI解析を開始' });
    await expect(analyzeBtn).toBeVisible({ timeout: 10000 });
    await expect(analyzeBtn).toBeDisabled();
  });
});
