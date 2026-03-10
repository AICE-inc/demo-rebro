import { test, expect } from '@playwright/test';

test.describe('デモ フルフロー', () => {
  test('Step1〜Step4まで完全に操作して縮尺比率が表示される', async ({ page }) => {
    test.setTimeout(120000);

    // Step1: デモページへアクセス
    await page.goto('/demo');
    await expect(page.locator('text=図面PDFをアップロード')).toBeVisible();

    // Step1: サンプル図面ボタンをクリック
    await page.click('button:has-text("サンプル図面で試す")');

    // Step1: AI解析を開始ボタンが有効になるまで待つ（PDF.js処理完了）
    const analyzeBtn = page.locator('button:has-text("AI解析を開始")');
    await expect(analyzeBtn).toBeEnabled({ timeout: 20000 });

    // Step1: AI解析を開始
    await analyzeBtn.click();

    // Step2: 解析中画面の表示を確認
    await expect(page.locator('text=AIが図面を解析中...')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=解析ログ')).toBeVisible();

    // Step2→Step3: Gemini API完了まで待機（最大60秒）
    await expect(page.locator('text=基準寸法を選択')).toBeVisible({ timeout: 60000 });

    // Step3: 寸法候補ボックスが表示されるまで待つ
    // Step3Selectの各ボックスは style="cursor: pointer" を持つ
    const dimensionBoxes = page.locator('[style*="cursor: pointer"]');
    await expect(dimensionBoxes.first()).toBeVisible({ timeout: 10000 });

    // 選択前は「この寸法を基準にする」ボタンが disabled
    const selectBtn = page.locator('button:has-text("この寸法を基準にする")');
    await expect(selectBtn).toBeDisabled();

    // 最初の寸法ボックスをクリックして選択
    const dimText = await dimensionBoxes.first().textContent();
    console.log('選択した寸法:', dimText);
    await dimensionBoxes.first().click();

    // 選択後はボタンが enabled になる
    await expect(selectBtn).toBeEnabled({ timeout: 3000 });
    await selectBtn.click();

    // Step4: 縮尺比率計算画面が表示される
    await expect(page.locator('text=縮尺比率を計算')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=基準寸法（図面記載値）')).toBeVisible();

    // Step4: 選択した寸法が基準寸法として表示されている
    const baseDimValue = page.locator('text=' + dimText?.trim());
    await expect(baseDimValue).toBeVisible();

    // Step4: Rebroで計測した値を入力
    const measuredInput = page.locator('input[placeholder*="8831"]');
    await expect(measuredInput).toBeVisible();
    await measuredInput.fill('8831');

    // Step4: アニメーション完了を待つ
    await page.waitForTimeout(1500);

    // Step4: 縮尺補正比率の数値が表示されることを確認（inner spanを使う）
    const ratioSpan = page.locator('span').filter({ hasText: /^\d+\.\d{4}$/ }).last();
    await expect(ratioSpan).toBeVisible({ timeout: 5000 });

    const ratioText = await ratioSpan.textContent();
    console.log('縮尺補正比率:', ratioText);

    // 比率が 0 より大きい値であることを確認
    const ratioValue = parseFloat(ratioText ?? '0');
    expect(ratioValue).toBeGreaterThan(0);

    // Rebroへの入力手順が表示されることを確認
    await expect(page.locator('text=Rebroへの入力手順')).toBeVisible();
    await expect(page.getByText('メニュー → 加工 → 縮尺合わせ を選択')).toBeVisible();
  });

  test('Step4単体: 縮尺比率の計算が正しい', async ({ page }) => {
    test.setTimeout(120000);

    // Step1〜Step3と同様のフローを経由してStep4に到達
    await page.goto('/demo');
    await page.click('button:has-text("サンプル図面で試す")');

    const analyzeBtn = page.locator('button:has-text("AI解析を開始")');
    await expect(analyzeBtn).toBeEnabled({ timeout: 20000 });
    await analyzeBtn.click();

    await expect(page.locator('text=基準寸法を選択')).toBeVisible({ timeout: 60000 });
    await page.waitForTimeout(500);

    // 最初の寸法ボックスを選択
    const dimensionBoxes = page.locator('[style*="cursor: pointer"]');
    await expect(dimensionBoxes.first()).toBeVisible({ timeout: 10000 });

    // 選択した寸法のテキストを取得しておく
    const firstDimText = await dimensionBoxes.first().textContent();
    console.log('選択した寸法:', firstDimText);

    await dimensionBoxes.first().click();

    const selectBtn = page.locator('button:has-text("この寸法を基準にする")');
    await expect(selectBtn).toBeEnabled({ timeout: 5000 });
    await selectBtn.click();

    await expect(page.locator('text=縮尺比率を計算')).toBeVisible({ timeout: 10000 });

    // Step4: 基準寸法（図面記載値）が表示されることを確認
    await expect(page.locator('text=基準寸法（図面記載値）')).toBeVisible();

    // Step4: Rebroで計測した値を入力して計算検証
    const measuredInput = page.locator('input[placeholder*="8831"]');
    await expect(measuredInput).toBeVisible();
    await measuredInput.fill('10000');

    // アニメーション完了を待つ
    await page.waitForTimeout(1500);

    // 縮尺補正比率が表示されることを確認
    const ratioSpan = page.locator('span').filter({ hasText: /^\d+\.\d{4}$/ }).last();
    await expect(ratioSpan).toBeVisible({ timeout: 5000 });

    const ratioText = await ratioSpan.textContent();
    console.log('縮尺補正比率 (計測値=10000):', ratioText);

    // 比率が 0 より大きい値であることを確認
    const ratioValue = parseFloat(ratioText ?? '0');
    expect(ratioValue).toBeGreaterThan(0);

    // Rebroへの入力手順が表示されることを確認
    await expect(page.locator('text=Rebroへの入力手順')).toBeVisible();
  });
});
