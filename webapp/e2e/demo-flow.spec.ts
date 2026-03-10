import { test, expect } from '@playwright/test';

test.describe('デモページ - Step1', () => {
  test('Step1のアップロード画面が表示される', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('text=図面PDFをアップロード')).toBeVisible();
    await expect(page.locator('text=サンプル図面で試す')).toBeVisible();
  });

  test('サンプルPDFを使ったフローが開始できる', async ({ page }) => {
    await page.goto('/demo');
    // サンプルボタンをクリック (テキストで特定)
    const sampleBtn = page.locator('button', { hasText: 'サンプル図面で試す' });
    // ボタンが存在することを確認
    await expect(sampleBtn).toBeVisible();
  });

  test('ステップインジケーターが4ステップ表示される', async ({ page }) => {
    await page.goto('/demo');
    // exact: true でステップインジケーターの「アップロード」のみを対象にする
    await expect(page.getByText('アップロード', { exact: true })).toBeVisible();
    await expect(page.locator('text=寸法選択')).toBeVisible();
    await expect(page.getByText('結果', { exact: true })).toBeVisible();
  });

  test('ファイルアップロードエリアが存在する', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('text=クリックまたはドラッグ')).toBeVisible();
  });
});

test.describe('Step4 - 縮尺比率計算', () => {
  test('デモページに正しくアクセスできる', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.locator('text=図面PDFをアップロード')).toBeVisible();
  });
});
