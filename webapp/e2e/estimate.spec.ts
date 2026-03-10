import { test, expect } from '@playwright/test';

test.describe('デモ③ 見積書生成 (/estimate)', () => {
  test('ページが表示される', async ({ page }) => {
    await page.goto('/estimate');

    await expect(page.locator('text=見積書生成')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=DEMO 03')).toBeVisible();
  });

  test('Step1 プロジェクト登録フォームが表示される', async ({ page }) => {
    await page.goto('/estimate');

    await expect(page.locator('text=プロジェクト情報')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=現場名')).toBeVisible();
    await expect(page.locator('text=工事日付')).toBeVisible();
    // 実際のラベルテキスト: 「提出先（デベロッパー名）」
    await expect(page.locator('text=提出先')).toBeVisible();
  });

  test('Step1: 現場名を入力して次へ進める', async ({ page }) => {
    await page.goto('/estimate');

    // 現場名の入力フィールドに入力（最初のinput要素）
    const firstInput = page.locator('input').first();
    await firstInput.fill('テスト現場');

    // 「次へ：Excelアップロード」ボタンが有効になる（実際のテキストに合わせる）
    const nextButton = page.locator('button', { hasText: '次へ' });
    await expect(nextButton).toBeEnabled({ timeout: 5000 });
    await nextButton.click();

    // Step2に遷移（「拾い表 Excel アップロード」見出しが表示される）
    await expect(page.getByText('拾い表 Excel アップロード', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('Step2: アップロードエリアが表示される', async ({ page }) => {
    await page.goto('/estimate');

    // Step1を完了
    const firstInput = page.locator('input').first();
    await firstInput.fill('テスト現場');
    await page.locator('button', { hasText: '次へ' }).click();

    // Step2のアップロードエリアを確認
    await expect(page.locator('text=クリックしてファイルを選択')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=.xlsx ファイル')).toBeVisible();
  });

  test('ステップインジケーターが表示される', async ({ page }) => {
    await page.goto('/estimate');

    await expect(page.locator('text=プロジェクト登録')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=AIマッチング確認')).toBeVisible();
    await expect(page.locator('text=パラメータ設定')).toBeVisible();
  });

  test('トップへ戻るリンクが機能する', async ({ page }) => {
    await page.goto('/estimate');
    await page.click('text=トップへ戻る');
    await expect(page).toHaveURL('/');
  });

  test('現場名が空のとき次へボタンがdisabledになっている', async ({ page }) => {
    await page.goto('/estimate');

    // 現場名未入力状態ではボタンが無効
    const nextButton = page.locator('button', { hasText: '次へ' });
    await expect(nextButton).toBeDisabled({ timeout: 10000 });
  });
});
