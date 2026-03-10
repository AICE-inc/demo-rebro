# Rebro AI デモ v2 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 縮尺合わせ・AI配管作図支援・見積書生成の3機能を1つのNext.js WebアプリにリニューアルしてBtoB建設クライアント向けデモを完成させる。

**Architecture:** 既存の `/demo` ウィザード（Step1〜4）を `/scale` に移動しつつ、新たに `/guide`（Claude Streamingチャット）と `/estimate`（ExcelJSパーサー＋Claude AIマッチング）を追加する。トップページはanime.jsヒーロー演出付きの3デモランディングに刷新する。

**Tech Stack:** Next.js 16 App Router, TypeScript, Radix UI Themes v3, anime.js v4, Gemini Vision API, Claude API (@anthropic-ai/sdk), ExcelJS, Tailwind CSS v4

---

## 前提・環境確認

- ワーキングディレクトリ: `dev/demo/rebro/webapp/`
- 環境変数: `.env.local` に `GEMINI_API_KEY` と `ANTHROPIC_API_KEY` が設定済み
- dev サーバー起動: `npm run dev`（ポート3000）
- ビルド確認: `npm run build`
- テスト: `npm test`（vitest）

---

## Task 1: ExcelJS パッケージのインストール

**Files:**
- Modify: `package.json`

**Step 1: インストール実行**

```bash
cd dev/demo/rebro/webapp
npm install exceljs
```

Expected: `node_modules/exceljs/` が追加される

**Step 2: TypeScript型確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし（exceljs には型定義が同梱）

**Step 3: コミット**

```bash
git add package.json package-lock.json
git commit -m "Rebro AIデモ v2：ExcelJSパッケージ追加"
```

---

## Task 2: トップページの刷新（3デモランディング）

**Files:**
- Modify: `app/page.tsx`

**概要:** 現在は縮尺合わせデモ1つのランディングページ。3つのデモカードに変える。

**Step 1: `app/page.tsx` を以下に書き換える**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { Box, Flex, Text, Button, Heading, Badge } from '@radix-ui/themes';
import Link from 'next/link';
import { HeroGrid } from '@/components/HeroGrid';

const DEMOS = [
  {
    href: '/scale',
    number: '01',
    title: '縮尺合わせ',
    problem: '図面の寸法を目視で読み取りRebroに手入力',
    solution: 'Gemini VisionがPDFから寸法を自動抽出し縮尺比率を計算',
    color: '#00d4ff',
  },
  {
    href: '/guide',
    number: '02',
    title: 'AI配管作図支援',
    problem: '配管径の選定に熟練が必要、Rebro操作手順を都度確認',
    solution: 'ClaudeがSHASE基準で配管径を計算しRebro操作手順を自動生成',
    color: '#7c3aed',
  },
  {
    href: '/estimate',
    number: '03',
    title: '見積書生成',
    problem: '拾い表から単価を1品目ずつカタログ検索・手入力（数時間）',
    solution: 'ClaudeがExcelを解析しAIマッチングで自動単価付け・見積書生成',
    color: '#059669',
  },
];

export default function HomePage() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    import('animejs').then(({ animate }) => {
      animate(titleRef.current, {
        opacity: [0, 1],
        translateY: [40, 0],
        duration: 1200,
        easing: 'easeOutExpo',
      });
    });
  }, []);

  return (
    <Box style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <HeroGrid />

      <Flex
        direction="column"
        align="center"
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          padding: '4rem 2rem',
          textAlign: 'center',
        }}
        gap="6"
      >
        <Badge color="cyan" variant="surface" size="2">
          AI × 建築設備
        </Badge>

        <Heading
          ref={titleRef}
          size="9"
          style={{
            opacity: 0,
            background: 'linear-gradient(135deg, #e8eaf6 0%, #00d4ff 60%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            maxWidth: '800px',
            lineHeight: '1.1',
          }}
        >
          Rebro AI デモ
        </Heading>

        <Text
          size="4"
          style={{ color: 'var(--gray-11)', maxWidth: '560px', lineHeight: '1.6' }}
        >
          配管設備工事の3つの課題をAIで自動化。
          佐藤建設様向けデモンストレーションです。
        </Text>

        <Flex gap="5" mt="6" wrap="wrap" justify="center" style={{ maxWidth: '1000px', width: '100%' }}>
          {DEMOS.map((demo) => (
            <Box
              key={demo.href}
              style={{
                flex: '1',
                minWidth: '280px',
                maxWidth: '320px',
                padding: '2rem',
                background: 'rgba(0,0,0,0.5)',
                border: `1px solid ${demo.color}33`,
                borderRadius: '16px',
                textAlign: 'left',
                transition: 'border-color 0.2s',
              }}
            >
              <Text size="1" style={{ color: demo.color, fontFamily: 'monospace', display: 'block', marginBottom: '0.5rem' }}>
                DEMO {demo.number}
              </Text>
              <Text size="5" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '1rem' }}>
                {demo.title}
              </Text>
              <Box style={{ marginBottom: '0.5rem' }}>
                <Text size="1" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.25rem' }}>課題</Text>
                <Text size="2" style={{ color: 'var(--gray-11)' }}>{demo.problem}</Text>
              </Box>
              <Box style={{ marginBottom: '1.5rem' }}>
                <Text size="1" style={{ color: demo.color, display: 'block', marginBottom: '0.25rem' }}>AIの解決</Text>
                <Text size="2" style={{ color: 'var(--gray-11)' }}>{demo.solution}</Text>
              </Box>
              <Button asChild size="3" variant="solid" style={{ background: demo.color, color: '#0a0a0f', width: '100%' }}>
                <Link href={demo.href}>デモを開始する</Link>
              </Button>
            </Box>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}
```

**Step 2: dev サーバーで目視確認**

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開き、3つのデモカードが表示されることを確認。

**Step 3: ビルド確認**

```bash
npm run build
```

Expected: エラーなし

**Step 4: コミット**

```bash
git add app/page.tsx
git commit -m "Rebro AIデモ v2：トップページを3デモランディングに刷新"
```

---

## Task 3: デモ① ルートを /demo → /scale に移動

**Files:**
- Create: `app/scale/page.tsx`（既存 `app/demo/page.tsx` の内容をコピー）
- Modify: `app/scale/page.tsx`（パスの修正）

**Step 1: `app/scale/` ディレクトリを作成し、`app/demo/page.tsx` の内容をコピー**

`app/scale/page.tsx` を作成し、`app/demo/page.tsx` の内容をそのままコピーする（差分は次のステップで変更）。

**Step 2: `app/scale/page.tsx` のトップへのリンクを修正**

`app/demo/page.tsx` の中の `onRestart` 後の遷移先が `/demo` になっている場合は `/scale` に変更する。また、Step コンポーネントの `import` パスが `@/components/` になっていることを確認する。

**Step 3: 動作確認**

http://localhost:3000/scale にアクセスしてStep1〜4が動くことを確認。

**Step 4: コミット**

```bash
git add app/scale/
git commit -m "Rebro AIデモ v2：縮尺合わせを /scale に移動"
```

---

## Task 4: Step4Result に「Rebro確認チェック」を追加

**Files:**
- Modify: `components/Step4Result.tsx`

**概要:** 縮尺比率が計算された後、「Rebroで確認できましたか？」チェックボックスを追加。チェックを入れると「完了・トップへ」ボタンが活性化する。

**Step 1: `components/Step4Result.tsx` を修正**

Props に `onComplete?: () => void` を追加し、以下のチェックボックスブロックを `ratio &&` の表示ブロックの後（「もう一度試す」ボタンの前）に挿入する:

```tsx
// ファイル冒頭の import に追加
import { useState, useEffect, useRef } from 'react';
import { Checkbox } from '@radix-ui/themes'; // Radix Themes に Checkbox は存在しないため以下で代替
```

`Step4Result` コンポーネント内に以下を追加:

```tsx
// Props 型の修正
interface Props {
  baseDimension: string;
  onRestart: () => void;
  onComplete?: () => void;
}

// コンポーネント内に追加する state
const [confirmed, setConfirmed] = useState(false);
```

`ratio` が存在する場合の表示ブロックに以下を追加（「もう一度試す」ボタンの直前）:

```tsx
{ratio && (
  <Flex direction="column" gap="3" align="center" style={{ maxWidth: '480px', width: '100%' }}>
    <Flex
      align="center"
      gap="3"
      style={{
        padding: '1rem 1.5rem',
        background: confirmed ? 'rgba(0,212,255,0.1)' : 'rgba(0,0,0,0.3)',
        border: `1px solid ${confirmed ? 'rgba(0,212,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: '12px',
        cursor: 'pointer',
        width: '100%',
        transition: 'all 0.2s',
      }}
      onClick={() => setConfirmed(!confirmed)}
    >
      <Box style={{
        width: '20px', height: '20px', borderRadius: '4px',
        border: `2px solid ${confirmed ? '#00d4ff' : 'rgba(255,255,255,0.3)'}`,
        background: confirmed ? '#00d4ff' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 0.2s',
      }}>
        {confirmed && <Text size="1" style={{ color: '#0a0a0f', fontWeight: 'bold' }}>✓</Text>}
      </Box>
      <Text size="3" style={{ color: confirmed ? '#e8eaf6' : 'var(--gray-10)' }}>
        Rebroで縮尺を確認できました
      </Text>
    </Flex>

    {confirmed && (
      <Button
        asChild
        size="3"
        variant="solid"
        style={{ background: '#00d4ff', color: '#0a0a0f', width: '100%' }}
      >
        <a href="/">完了・トップへ戻る</a>
      </Button>
    )}
  </Flex>
)}
```

**Step 2: 動作確認**

http://localhost:3000/scale でStep4まで進み、計測値を入力 → チェックボックスが出現 → チェック → 「完了・トップへ」ボタンが出ることを確認。

**Step 3: コミット**

```bash
git add components/Step4Result.tsx
git commit -m "Rebro AIデモ v2：Step4にRebro確認チェックボックスを追加"
```

---

## Task 5: サンプルカタログJSON の作成

**Files:**
- Create: `public/sample/catalog.json`

**概要:** デモ③で使うサンプル単価データ。実際の拾い表Excel品目に合わせた約30品目のJSONを作成する。

**Step 1: `public/sample/catalog.json` を作成**

```json
{
  "items": [
    { "code": "QXPEM2-13A", "name": "架橋ポリエチレン管", "spec": "13A", "unit": "m", "unitPrice": 480 },
    { "code": "QXPEM2-20A", "name": "架橋ポリエチレン管", "spec": "20A", "unit": "m", "unitPrice": 720 },
    { "code": "QXPEM2-25A", "name": "架橋ポリエチレン管", "spec": "25A", "unit": "m", "unitPrice": 980 },
    { "code": "QXPEM2-30A", "name": "架橋ポリエチレン管", "spec": "30A", "unit": "m", "unitPrice": 1240 },
    { "code": "ELB-13A", "name": "エルボ", "spec": "13A", "unit": "個", "unitPrice": 120 },
    { "code": "ELB-20A", "name": "エルボ", "spec": "20A", "unit": "個", "unitPrice": 180 },
    { "code": "ELB-25A", "name": "エルボ", "spec": "25A", "unit": "個", "unitPrice": 250 },
    { "code": "TEE-13A", "name": "チーズ", "spec": "13A", "unit": "個", "unitPrice": 160 },
    { "code": "TEE-20A", "name": "チーズ", "spec": "20A", "unit": "個", "unitPrice": 240 },
    { "code": "TEE-25A", "name": "チーズ", "spec": "25A", "unit": "個", "unitPrice": 320 },
    { "code": "SOC-13A", "name": "ソケット", "spec": "13A", "unit": "個", "unitPrice": 90 },
    { "code": "SOC-20A", "name": "ソケット", "spec": "20A", "unit": "個", "unitPrice": 130 },
    { "code": "VLP-50", "name": "塩ビ管（VLP）", "spec": "50φ", "unit": "m", "unitPrice": 380 },
    { "code": "VLP-75", "name": "塩ビ管（VLP）", "spec": "75φ", "unit": "m", "unitPrice": 560 },
    { "code": "VLP-100", "name": "塩ビ管（VLP）", "spec": "100φ", "unit": "m", "unitPrice": 820 },
    { "code": "DRN-ELB-50", "name": "排水エルボ", "spec": "50φ", "unit": "個", "unitPrice": 210 },
    { "code": "DRN-ELB-75", "name": "排水エルボ", "spec": "75φ", "unit": "個", "unitPrice": 320 },
    { "code": "DRN-ELB-100", "name": "排水エルボ", "spec": "100φ", "unit": "個", "unitPrice": 480 },
    { "code": "DRN-TEE-50", "name": "排水チーズ", "spec": "50φ", "unit": "個", "unitPrice": 280 },
    { "code": "DRN-TEE-75", "name": "排水チーズ", "spec": "75φ", "unit": "個", "unitPrice": 420 },
    { "code": "FLEX-13A", "name": "フレキシブル管", "spec": "13A", "unit": "m", "unitPrice": 650 },
    { "code": "FLEX-20A", "name": "フレキシブル管", "spec": "20A", "unit": "m", "unitPrice": 920 },
    { "code": "INSUL-13A", "name": "保温材", "spec": "13A", "unit": "m", "unitPrice": 180 },
    { "code": "INSUL-20A", "name": "保温材", "spec": "20A", "unit": "m", "unitPrice": 240 },
    { "code": "INSUL-25A", "name": "保温材", "spec": "25A", "unit": "m", "unitPrice": 310 },
    { "code": "BAND-13A", "name": "支持バンド", "spec": "13A", "unit": "個", "unitPrice": 85 },
    { "code": "BAND-20A", "name": "支持バンド", "spec": "20A", "unit": "個", "unitPrice": 110 },
    { "code": "BALL-13A", "name": "ボールバルブ", "spec": "13A", "unit": "個", "unitPrice": 1200 },
    { "code": "BALL-20A", "name": "ボールバルブ", "spec": "20A", "unit": "個", "unitPrice": 1800 },
    { "code": "STRAINER-20A", "name": "ストレーナー", "spec": "20A", "unit": "個", "unitPrice": 2400 }
  ]
}
```

**Step 2: コミット**

```bash
git add public/sample/catalog.json
git commit -m "Rebro AIデモ v2：サンプルカタログJSONを追加"
```

---

## Task 6: Excelパーサーライブラリの作成

**Files:**
- Create: `lib/excel-parser.ts`

**概要:** 拾い表Excelを解析して品目リストを返す。階層構造（空白セルで親カテゴリを表現）に対応し、単位を自動判定してmに統一する。

**Step 1: `lib/excel-parser.ts` を作成**

```typescript
import ExcelJS from 'exceljs';

export interface ParsedItem {
  category: string;      // 大カテゴリ（配管・継手など）
  subCategory: string;   // 小カテゴリ（給水・給湯など）
  code: string;          // 品番コード
  name: string;          // 品名
  spec: string;          // 規格・径
  quantity: number;      // 数量（mに統一済み）
  unit: string;          // 単位（統一後）
  sourceFile: string;    // 元ファイル名
}

export type FileType = 'water-hot' | 'drain'; // 水湯焚・給水給湯 or 排水

function detectFileType(filename: string): FileType {
  const lower = filename.toLowerCase();
  if (lower.includes('排水') || lower.includes('haisui') || lower.includes('drain')) {
    return 'drain';
  }
  return 'water-hot';
}

function normalizeQuantity(value: number, unit: string, fileType: FileType): { quantity: number; unit: string } {
  // 排水ファイルは mm → m 変換
  if (fileType === 'drain' && (unit === 'mm' || unit === '' )) {
    return { quantity: value / 1000, unit: 'm' };
  }
  return { quantity: value, unit: unit || 'm' };
}

function getCellValue(cell: ExcelJS.Cell): string {
  if (cell.value === null || cell.value === undefined) return '';
  if (typeof cell.value === 'object' && 'text' in cell.value) return String((cell.value as ExcelJS.CellRichTextValue).text);
  return String(cell.value).trim();
}

export async function parseExcelFile(buffer: ArrayBuffer, filename: string): Promise<ParsedItem[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const fileType = detectFileType(filename);
  const items: ParsedItem[] = [];

  workbook.eachSheet((worksheet) => {
    let currentCategory = '';
    let currentSubCategory = '';

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < 3) return; // ヘッダー行をスキップ

      const colB = getCellValue(row.getCell(2));  // B列：大カテゴリ
      const colC = getCellValue(row.getCell(3));  // C列：小カテゴリ
      const colV = getCellValue(row.getCell(22)); // V列：品番
      const colW = getCellValue(row.getCell(23)); // W列：数量
      const colX = getCellValue(row.getCell(24)); // X列：単位

      // 親カテゴリの継承（空白セルを遡る）
      if (colB) currentCategory = colB;
      if (colC) currentSubCategory = colC;

      // 品番と数量が存在する行のみ品目として扱う
      if (!colV || !colW) return;

      const quantityRaw = parseFloat(colW.replace(/[^0-9.]/g, ''));
      if (isNaN(quantityRaw) || quantityRaw === 0) return;

      // 品番から品名と規格を分解（品番例：QXPEM2-13AB-200M）
      // 規格は品番の中のサイズ部分（13A, 20A, 75φ など）
      const specMatch = colV.match(/(\d+[Aφ])/);
      const spec = specMatch ? specMatch[1] : '';
      const name = currentSubCategory || currentCategory;

      const { quantity, unit } = normalizeQuantity(quantityRaw, colX, fileType);

      items.push({
        category: currentCategory,
        subCategory: currentSubCategory,
        code: colV,
        name,
        spec,
        quantity,
        unit,
        sourceFile: filename,
      });
    });
  });

  return items;
}
```

**Step 2: TypeScript型チェック**

```bash
npx tsc --noEmit
```

Expected: エラーなし

**Step 3: コミット**

```bash
git add lib/excel-parser.ts
git commit -m "Rebro AIデモ v2：拾い表Excelパーサーを実装"
```

---

## Task 7: AIマッチングエンジンの作成

**Files:**
- Create: `lib/matching-engine.ts`

**概要:** 4段階マッチング（コード完全一致→キーワード→Claude API類似度→部分一致）を実装する。

**Step 1: `lib/matching-engine.ts` を作成**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { ParsedItem } from './excel-parser';

export interface CatalogItem {
  code: string;
  name: string;
  spec: string;
  unit: string;
  unitPrice: number;
}

export type MatchStatus = 'exact' | 'candidate' | 'unregistered';

export interface MatchResult {
  item: ParsedItem;
  status: MatchStatus;
  matchedCatalog: CatalogItem | null;
  candidates: CatalogItem[];
  confidence: number; // 0〜1
}

// Step1: 商品コード完全一致
function matchByCode(item: ParsedItem, catalog: CatalogItem[]): CatalogItem | null {
  return catalog.find(c => c.code === item.code) || null;
}

// Step2: 品目+規格キーワード一致（品名の一部 AND 規格が一致）
function matchByKeyword(item: ParsedItem, catalog: CatalogItem[]): CatalogItem[] {
  return catalog.filter(c => {
    const nameMatch = item.name && c.name.includes(item.name.substring(0, 4));
    const specMatch = item.spec && c.spec === item.spec;
    return nameMatch && specMatch;
  });
}

// Step4: 品名部分一致（fallback）
function matchByPartialName(item: ParsedItem, catalog: CatalogItem[]): CatalogItem[] {
  if (!item.name) return [];
  return catalog.filter(c =>
    c.name.includes(item.name.substring(0, 3)) || item.name.includes(c.name.substring(0, 3))
  );
}

// Step3: Claude APIで類似度スコアを計算（バッチで複数品目を一度に送信）
async function matchByClaude(
  items: ParsedItem[],
  catalog: CatalogItem[],
  client: Anthropic
): Promise<Map<string, { matched: CatalogItem | null; candidates: CatalogItem[]; confidence: number }>> {
  const catalogSummary = catalog.map(c => `${c.code}|${c.name}|${c.spec}`).join('\n');

  const prompt = `以下の品目リストと、カタログの品目を照合してください。
各品目について、最も一致するカタログ品目を1つ特定し、類似度スコア（0.0〜1.0）を返してください。

## 照合ルール
- 品名と規格（径）の組み合わせで照合する
- 完全一致または同義語の場合は0.95以上
- 似ているが確認が必要な場合は0.70〜0.92
- 全く対応がない場合は0.70未満

## 拾い表品目
${items.map((item, i) => `${i}: code=${item.code}, name=${item.name}, spec=${item.spec}`).join('\n')}

## カタログ
${catalogSummary}

## 出力形式（JSONのみ、説明不要）
[
  { "index": 0, "catalogCode": "マッチしたコードまたはnull", "score": 0.95 },
  ...
]`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const results: { index: number; catalogCode: string | null; score: number }[] = jsonMatch
      ? JSON.parse(jsonMatch[0])
      : [];

    const resultMap = new Map<string, { matched: CatalogItem | null; candidates: CatalogItem[]; confidence: number }>();

    results.forEach(r => {
      const item = items[r.index];
      if (!item) return;
      const key = `${item.code}|${item.spec}`;
      const catalogItem = r.catalogCode ? catalog.find(c => c.code === r.catalogCode) || null : null;

      if (r.score >= 0.92) {
        resultMap.set(key, { matched: catalogItem, candidates: [], confidence: r.score });
      } else if (r.score >= 0.70) {
        const candidates = matchByPartialName(item, catalog).slice(0, 3);
        resultMap.set(key, { matched: null, candidates: catalogItem ? [catalogItem, ...candidates] : candidates, confidence: r.score });
      } else {
        resultMap.set(key, { matched: null, candidates: [], confidence: r.score });
      }
    });

    return resultMap;
  } catch {
    return new Map();
  }
}

export async function runMatching(items: ParsedItem[], catalog: CatalogItem[]): Promise<MatchResult[]> {
  const client = new Anthropic();
  const results: MatchResult[] = [];

  // Step1・Step2 でマッチできない品目をClaude送信対象にする
  const needsClaude: { item: ParsedItem; index: number }[] = [];

  const prelimResults = items.map((item, index) => {
    // Step1: コード完全一致
    const exactByCode = matchByCode(item, catalog);
    if (exactByCode) {
      return {
        item, status: 'exact' as MatchStatus,
        matchedCatalog: exactByCode, candidates: [], confidence: 1.0,
      };
    }

    // Step2: キーワード一致
    const keywordMatches = matchByKeyword(item, catalog);
    if (keywordMatches.length === 1) {
      return {
        item, status: 'exact' as MatchStatus,
        matchedCatalog: keywordMatches[0], candidates: [], confidence: 0.95,
      };
    }
    if (keywordMatches.length > 1) {
      return {
        item, status: 'candidate' as MatchStatus,
        matchedCatalog: null, candidates: keywordMatches.slice(0, 3), confidence: 0.85,
      };
    }

    needsClaude.push({ item, index });
    return null;
  });

  // Step3: Claude APIで残りを処理（バッチ送信）
  let claudeResults = new Map<string, { matched: CatalogItem | null; candidates: CatalogItem[]; confidence: number }>();
  if (needsClaude.length > 0) {
    claudeResults = await matchByClaude(needsClaude.map(n => n.item), catalog, client);
  }

  items.forEach((item, i) => {
    const prelim = prelimResults[i];
    if (prelim) {
      results.push(prelim);
      return;
    }

    const key = `${item.code}|${item.spec}`;
    const claudeResult = claudeResults.get(key);

    if (claudeResult?.matched) {
      results.push({ item, status: 'exact', matchedCatalog: claudeResult.matched, candidates: [], confidence: claudeResult.confidence });
      return;
    }
    if (claudeResult && claudeResult.candidates.length > 0) {
      results.push({ item, status: 'candidate', matchedCatalog: null, candidates: claudeResult.candidates, confidence: claudeResult.confidence });
      return;
    }

    // Step4: 部分一致 fallback
    const partialMatches = matchByPartialName(item, catalog);
    if (partialMatches.length > 0) {
      results.push({ item, status: 'candidate', matchedCatalog: null, candidates: partialMatches.slice(0, 3), confidence: 0.5 });
      return;
    }

    results.push({ item, status: 'unregistered', matchedCatalog: null, candidates: [], confidence: 0 });
  });

  return results;
}
```

**Step 2: TypeScript型チェック**

```bash
npx tsc --noEmit
```

**Step 3: コミット**

```bash
git add lib/matching-engine.ts
git commit -m "Rebro AIデモ v2：4段階AIマッチングエンジンを実装"
```

---

## Task 8: Excel見積書生成ライブラリの作成

**Files:**
- Create: `lib/excel-generator.ts`

**概要:** マッチング結果とパラメータを受け取り、見積書Excelを生成してバッファで返す。

**Step 1: `lib/excel-generator.ts` を作成**

```typescript
import ExcelJS from 'exceljs';
import { MatchResult } from './matching-engine';

export interface EstimateParams {
  projectName: string;
  date: string;
  developerName: string;
  markupRate: number;   // 掛率（例：1.2）
  processingFee: number; // 加工費（円）
  overheadRate: number;  // 経費率（例：0.1）
  discountRate: number;  // 値引き（例：0.05）
}

export async function generateEstimateExcel(
  results: MatchResult[],
  params: EstimateParams
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // ---- シート1：表紙 ----
  const coverSheet = workbook.addWorksheet('表紙');
  coverSheet.getCell('B2').value = '見積書';
  coverSheet.getCell('B2').font = { size: 20, bold: true };
  coverSheet.getCell('B4').value = `現場名：${params.projectName}`;
  coverSheet.getCell('B5').value = `工事日：${params.date}`;
  coverSheet.getCell('B6').value = `デベロッパー：${params.developerName}`;

  // ---- シート2：品目明細 ----
  const detailSheet = workbook.addWorksheet('品目明細');
  const headers = ['品番', '品名', '規格', '数量', '単位', '単価', '金額', 'ステータス'];
  detailSheet.addRow(headers);
  detailSheet.getRow(1).eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });

  let totalAmount = 0;

  results.forEach(result => {
    const unitPrice = result.matchedCatalog?.unitPrice || 0;
    const amount = unitPrice * result.item.quantity * params.markupRate;
    totalAmount += amount;

    const row = detailSheet.addRow([
      result.item.code,
      result.item.name,
      result.item.spec,
      result.item.quantity,
      result.item.unit,
      unitPrice,
      Math.round(amount),
      result.status === 'exact' ? '一致' : result.status === 'candidate' ? '候補' : '未登録',
    ]);

    // 色分け
    const statusCell = row.getCell(8);
    if (result.status === 'unregistered') {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFCCCC' } };
      });
      statusCell.font = { color: { argb: 'FFCC0000' }, bold: true };
    } else if (result.status === 'candidate') {
      row.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } };
      });
      statusCell.font = { color: { argb: 'FF997700' }, bold: true };
    }
  });

  // ---- シート3：全室集計 ----
  const summarySheet = workbook.addWorksheet('全室集計');
  summarySheet.addRow(['', '金額']);
  summarySheet.addRow(['材料費合計', Math.round(totalAmount)]);

  const withProcessing = Math.round(totalAmount + params.processingFee);
  summarySheet.addRow(['加工費', params.processingFee]);
  summarySheet.addRow(['小計', withProcessing]);

  const withOverhead = Math.round(withProcessing * (1 + params.overheadRate));
  summarySheet.addRow(['経費', Math.round(withProcessing * params.overheadRate)]);
  summarySheet.addRow(['合計', withOverhead]);

  const discounted = Math.round(withOverhead * (1 - params.discountRate));
  summarySheet.addRow(['値引き', -Math.round(withOverhead * params.discountRate)]);
  summarySheet.addRow(['最終見積金額', discounted]);

  const finalRow = summarySheet.lastRow;
  if (finalRow) {
    finalRow.eachCell(cell => {
      cell.font = { bold: true, size: 13 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00447A' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 13 };
    });
  }

  // 列幅調整
  detailSheet.columns.forEach(col => { col.width = 18; });
  summarySheet.columns.forEach(col => { col.width = 20; });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
```

**Step 2: TypeScript型チェック**

```bash
npx tsc --noEmit
```

**Step 3: コミット**

```bash
git add lib/excel-generator.ts
git commit -m "Rebro AIデモ v2：見積書Excel生成ライブラリを実装"
```

---

## Task 9: API ルート：estimate-match の作成

**Files:**
- Create: `app/api/estimate-match/route.ts`

**概要:** フロントからExcelファイル（ArrayBuffer）とカタログJSONを受け取り、マッチング結果を返す。

**Step 1: `app/api/estimate-match/route.ts` を作成**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { parseExcelFile } from '@/lib/excel-parser';
import { runMatching, CatalogItem } from '@/lib/matching-engine';
import { readFile } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 });
    }

    // カタログを読み込む
    const catalogPath = path.join(process.cwd(), 'public', 'sample', 'catalog.json');
    const catalogJson = await readFile(catalogPath, 'utf-8');
    const catalog: CatalogItem[] = JSON.parse(catalogJson).items;

    // 全ファイルをパース
    const allItems = [];
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const items = await parseExcelFile(buffer, file.name);
      allItems.push(...items);
    }

    if (allItems.length === 0) {
      return NextResponse.json({ error: '品目が見つかりませんでした' }, { status: 400 });
    }

    // AIマッチング実行
    const results = await runMatching(allItems, catalog);

    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    console.error('estimate-match error:', error);
    return NextResponse.json({ error: 'マッチング処理に失敗しました' }, { status: 500 });
  }
}
```

**Step 2: TypeScript型チェック**

```bash
npx tsc --noEmit
```

**Step 3: コミット**

```bash
git add app/api/estimate-match/route.ts
git commit -m "Rebro AIデモ v2：AIマッチングAPIルートを実装"
```

---

## Task 10: API ルート：estimate-export の作成

**Files:**
- Create: `app/api/estimate-export/route.ts`

**概要:** マッチング結果とパラメータを受け取り、見積書ExcelをダウンロードできるレスポンスとしてPOSTで返す。

**Step 1: `app/api/estimate-export/route.ts` を作成**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { generateEstimateExcel, EstimateParams } from '@/lib/excel-generator';
import { MatchResult } from '@/lib/matching-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { results: MatchResult[]; params: EstimateParams };
    const { results, params } = body;

    const buffer = await generateEstimateExcel(results, params);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="estimate-${params.projectName}-${params.date}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('estimate-export error:', error);
    return NextResponse.json({ error: '出力に失敗しました' }, { status: 500 });
  }
}
```

**Step 2: TypeScript型チェック**

```bash
npx tsc --noEmit
```

**Step 3: コミット**

```bash
git add app/api/estimate-export/route.ts
git commit -m "Rebro AIデモ v2：見積書ExcelエクスポートAPIルートを実装"
```

---

## Task 11: API ルート：guide-chat の作成（Claude Streaming）

**Files:**
- Create: `app/api/guide-chat/route.ts`

**概要:** Claude APIのストリーミングレスポンスを返す。配管作図支援チャットのバックエンド。

**Step 1: `app/api/guide-chat/route.ts` を作成**

```typescript
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// モック：過去の類似現場データ
const PAST_PROJECTS = [
  {
    name: '○○マンション A棟',
    year: '2024年施工',
    scale: '2LDK×12戸',
    waterMain: '20A', waterBranch: '13A', drain: '75φ',
    fixtures: '洗面台1台・トイレ1台・キッチン1台（各戸）',
    method: '床配管',
  },
  {
    name: '△△レジデンス',
    year: '2023年施工',
    scale: '1LDK×20戸',
    waterMain: '25A', waterBranch: '13A', drain: '75φ',
    fixtures: '洗面台1台・トイレ1台（各戸）',
    method: '天井配管',
  },
  {
    name: '□□ハイツ B棟',
    year: '2024年施工',
    scale: '3LDK×8戸',
    waterMain: '25A', waterBranch: '13A', drain: '100φ',
    fixtures: '洗面台2台・トイレ2台・キッチン1台（各戸）',
    method: '床配管',
  },
];

const SYSTEM_PROMPT = `あなたはRebro（建築設備CAD）の配管作図支援AIアシスタントです。
設備工事の専門知識がない担当者でも操作できるよう、やさしく・能動的に会話をリードしてください。

## 過去の施工データ（参考）
${PAST_PROJECTS.map(p => `【${p.name}（${p.year}）】${p.scale} / ${p.fixtures} / ${p.method} → 給水幹線:${p.waterMain} 枝管:${p.waterBranch} 排水:${p.drain}`).join('\n')}

## 会話の進め方（あなたが能動的にリードする）

### STEP 1：現場の概要を聞く
まず現場名と戸数・間取りを聞く。専門用語は使わず、日常語で。

### STEP 2：過去データと照合して提案する
収集した情報を過去データと比較し、「○○マンションと似た規模ですね」と具体的に言及してから提案する。
「この場合は～になると思います。合っていますか？」という確認形式で進める。

### STEP 3：器具の種類と数を確認する
選択肢ボタン形式で質問するため、回答はシンプルな内容にする。
例：「洗面台・トイレ・キッチンは各戸に何台ありますか？ / 一般的な2LDKなら洗面台1・トイレ1・キッチン1です」

### STEP 4：配管方式を確認する
床配管か天井配管かを確認する。分からない場合は「床配管が一般的です」と誘導してよい。

### STEP 5：配管径とRebro手順を提示する
SHASE基準に基づく推奨配管径を提示し、Rebro操作手順をSTEPS:の後に出力する。

## 重要なルール
- 一度に1つだけ質問する
- 専門用語（SHASE、管径など）はAIが自然に解説しながら使う
- ユーザーが「よくわからない」と言ったら、過去データの標準例を提案して「これで進めましょうか？」と聞く
- Rebro操作手順はSTEPS:の後に具体的なメニュー名・設定値を含める
- 最初のメッセージはこちらから: 「こんにちは！配管作図のサポートをします。まず現場名と、何戸建てくらいの規模か教えてください。」

## SHASE推奨配管径の目安
- 給水幹線：洗面台+トイレ2台以下=13A、3〜5台=20A、6台以上=25A
- 給水枝管：各器具への接続=13A（一般器具）
- 排水縦管：1〜2器具=50φ、3〜5器具=75φ、6台以上=100φ`;

export async function POST(request: NextRequest) {
  const { messages } = await request.json() as { messages: { role: 'user' | 'assistant'; content: string }[] };

  const client = new Anthropic();

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

**Step 2: TypeScript型チェック**

```bash
npx tsc --noEmit
```

**Step 3: コミット**

```bash
git add app/api/guide-chat/route.ts
git commit -m "Rebro AIデモ v2：配管支援チャットAPIルートを実装（Claude Streaming）"
```

---

## Task 12: デモ② /guide ページの実装

**Files:**
- Create: `app/guide/page.tsx`
- Create: `components/GuideChat.tsx`
- Create: `components/GuideStepCard.tsx`

**Step 1: `components/GuideStepCard.tsx` を作成**

```tsx
'use client';

import { useState } from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';

interface Step {
  index: number;
  text: string;
}

interface Props {
  steps: Step[];
}

export function GuideStepCard({ steps }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  if (steps.length === 0) return null;

  return (
    <Box style={{
      background: 'rgba(0,0,0,0.5)',
      border: '1px solid rgba(124,58,237,0.3)',
      borderRadius: '16px',
      padding: '1.5rem',
      height: '100%',
    }}>
      <Text size="3" weight="bold" style={{ color: '#7c3aed', display: 'block', marginBottom: '1rem' }}>
        Rebro 操作手順
      </Text>

      {steps.map((step, i) => (
        <Flex
          key={i}
          gap="3"
          align="start"
          style={{
            marginBottom: '0.75rem',
            opacity: i > currentStep ? 0.3 : 1,
            transition: 'opacity 0.3s',
          }}
        >
          <Box style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: i < currentStep ? 'rgba(124,58,237,0.6)' : i === currentStep ? '#7c3aed' : 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(124,58,237,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all 0.3s',
          }}>
            <Text size="1" style={{ color: '#fff', fontWeight: 'bold' }}>
              {i < currentStep ? '✓' : i + 1}
            </Text>
          </Box>
          <Box style={{ flex: 1 }}>
            <Text size="2" style={{ color: i <= currentStep ? '#e8eaf6' : 'var(--gray-8)' }}>
              {step.text}
            </Text>
            {i === currentStep && i < steps.length - 1 && (
              <Button
                size="1"
                variant="solid"
                style={{ background: '#7c3aed', marginTop: '0.5rem' }}
                onClick={() => setCurrentStep(prev => prev + 1)}
              >
                完了
              </Button>
            )}
            {i === currentStep && i === steps.length - 1 && (
              <Text size="2" style={{ color: '#7c3aed', marginTop: '0.5rem', display: 'block', fontWeight: 'bold' }}>
                全ステップ完了
              </Text>
            )}
          </Box>
        </Flex>
      ))}
    </Box>
  );
}
```

**Step 2: `components/GuideChat.tsx` を作成**

AIが能動的に質問し、選択肢ボタンも提示できる設計にする。
AIのレスポンスに `OPTIONS:` プレフィックスがある場合、その後の行を選択肢ボタンとして表示する。

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Box, Flex, Text, TextField, Button } from '@radix-ui/themes';
import { GuideStepCard } from './GuideStepCard';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// "STEPS:\n1. xxx\n2. yyy" → [{index:0, text:'xxx'}, ...]
function parseSteps(text: string): { index: number; text: string }[] {
  const match = text.match(/STEPS:([\s\S]*?)(?:OPTIONS:|$)/);
  if (!match) return [];
  return match[1].split('\n')
    .map(l => l.replace(/^\d+[\.\:：]\s*/, '').trim())
    .filter(Boolean)
    .map((text, index) => ({ index, text }));
}

// "OPTIONS:\n- はい\n- いいえ" → ['はい', 'いいえ']
function parseOptions(text: string): string[] {
  const match = text.match(/OPTIONS:([\s\S]*?)(?:STEPS:|$)/);
  if (!match) return [];
  return match[1].split('\n')
    .map(l => l.replace(/^[-・]\s*/, '').trim())
    .filter(Boolean);
}

// 表示用テキスト（OPTIONS/STEPS ブロックを除去）
function displayText(text: string): string {
  return text.replace(/OPTIONS:[\s\S]*?(STEPS:|$)/, '').replace(/STEPS:[\s\S]*$/, '').trim();
}

export function GuideChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<{ index: number; text: string }[]>([]);
  const [currentOptions, setCurrentOptions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      sendMessage('', true); // AI側から最初のメッセージを送信
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(userText: string, isInit = false) {
    const newMessages: Message[] = isInit
      ? []
      : [...messages, { role: 'user', content: userText }];

    if (!isInit) {
      setMessages(newMessages);
      setInput('');
      setCurrentOptions([]); // 送信したら選択肢をリセット
    }
    setIsLoading(true);

    try {
      const res = await fetch('/api/guide-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: isInit ? [] : newMessages }),
      });

      if (!res.body) return;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantText };
          return updated;
        });
      }

      const parsedSteps = parseSteps(assistantText);
      if (parsedSteps.length > 0) setSteps(parsedSteps);

      const parsedOptions = parseOptions(assistantText);
      setCurrentOptions(parsedOptions);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Flex gap="4" style={{ height: 'calc(100vh - 120px)' }}>
      {/* 左ペイン：チャット */}
      <Flex direction="column" style={{ flex: '0 0 60%' }}>
        <Box style={{
          flex: 1, overflowY: 'auto', padding: '1rem',
          background: 'rgba(0,0,0,0.3)', borderRadius: '12px',
          border: '1px solid rgba(124,58,237,0.2)', marginBottom: '1rem',
        }}>
          {messages.map((msg, i) => (
            <Flex key={i} direction="column" align={msg.role === 'user' ? 'end' : 'start'} style={{ marginBottom: '1rem' }}>
              <Box style={{
                maxWidth: '85%', padding: '0.75rem 1rem', borderRadius: '12px',
                background: msg.role === 'user' ? '#7c3aed' : 'rgba(255,255,255,0.08)',
                border: msg.role === 'assistant' ? '1px solid rgba(124,58,237,0.3)' : 'none',
              }}>
                <Text size="2" style={{ color: '#e8eaf6', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                  {msg.role === 'assistant' ? displayText(msg.content) : msg.content}
                </Text>
              </Box>
            </Flex>
          ))}

          {/* 選択肢ボタン（最新AIメッセージのOPTIONSを表示） */}
          {!isLoading && currentOptions.length > 0 && (
            <Flex gap="2" wrap="wrap" style={{ marginBottom: '1rem', paddingLeft: '0.5rem' }}>
              {currentOptions.map(opt => (
                <Button
                  key={opt}
                  size="2"
                  variant="outline"
                  style={{ border: '1px solid rgba(124,58,237,0.5)', color: '#e8eaf6', cursor: 'pointer' }}
                  onClick={() => sendMessage(opt)}
                >
                  {opt}
                </Button>
              ))}
            </Flex>
          )}

          {isLoading && (
            <Flex align="center" gap="2" style={{ padding: '0.5rem' }}>
              <Text size="2" style={{ color: 'var(--gray-9)' }}>考え中...</Text>
            </Flex>
          )}
          <div ref={messagesEndRef} />
        </Box>

        <Flex gap="2">
          <TextField.Root
            style={{ flex: 1, background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.3)' }}
            placeholder="メッセージを入力、または上の選択肢をクリック"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            disabled={isLoading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={isLoading || !input.trim()}
            style={{ background: '#7c3aed' }}
          >
            送信
          </Button>
        </Flex>
      </Flex>

      {/* 右ペイン：Rebro操作ステップ */}
      <Box style={{ flex: '0 0 40%' }}>
        {steps.length > 0
          ? <GuideStepCard steps={steps} />
          : (
            <Box style={{
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: '16px', padding: '2rem', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Text size="2" style={{ color: 'var(--gray-9)', textAlign: 'center' }}>
                AIとの会話が完了すると<br />Rebro操作手順がここに表示されます
              </Text>
            </Box>
          )
        }
      </Box>
    </Flex>
  );
}
```

**Step 3: `app/guide/page.tsx` を作成**

```tsx
import { Box, Flex, Text, Heading } from '@radix-ui/themes';
import Link from 'next/link';
import { GuideChat } from '@/components/GuideChat';

export default function GuidePage() {
  return (
    <Box style={{ minHeight: '100vh', background: '#0a0a0f', padding: '2rem' }}>
      <Flex justify="between" align="center" style={{ marginBottom: '2rem' }}>
        <Box>
          <Text size="1" style={{ color: '#7c3aed', fontFamily: 'monospace', display: 'block' }}>DEMO 02</Text>
          <Heading size="6" style={{ color: '#e8eaf6' }}>AI配管作図支援ナビゲーター</Heading>
          <Text size="2" style={{ color: 'var(--gray-10)' }}>
            現場情報を入力するとSHASE基準の配管径とRebro操作手順を自動生成します
          </Text>
        </Box>
        <Link href="/" style={{ color: 'var(--gray-9)', fontSize: '14px' }}>← トップへ</Link>
      </Flex>

      <GuideChat />
    </Box>
  );
}
```

**Step 4: 動作確認**

http://localhost:3000/guide にアクセスし、AIが最初のメッセージを送信することを確認。会話を進めてSTEPS:が含まれた応答が来ると右ペインにステップカードが表示されることを確認。

**Step 5: コミット**

```bash
git add app/guide/ components/GuideChat.tsx components/GuideStepCard.tsx
git commit -m "Rebro AIデモ v2：デモ②AI配管作図支援ページを実装"
```

---

## Task 13: デモ③ /estimate ページの実装

**Files:**
- Create: `app/estimate/page.tsx`
- Create: `components/EstimateWizard.tsx`
- Create: `components/MatchingTable.tsx`

**Step 1: `components/MatchingTable.tsx` を作成**

```tsx
'use client';

import { useState } from 'react';
import { Box, Flex, Text, TextField, Select } from '@radix-ui/themes';
import { MatchResult, CatalogItem } from '@/lib/matching-engine';

interface Props {
  results: MatchResult[];
  onChange: (updated: MatchResult[]) => void;
}

const STATUS_COLOR: Record<string, string> = {
  exact: 'rgba(0,200,100,0.15)',
  candidate: 'rgba(255,200,0,0.15)',
  unregistered: 'rgba(255,80,80,0.15)',
};
const STATUS_LABEL: Record<string, string> = {
  exact: '一致',
  candidate: '候補あり',
  unregistered: '未登録',
};

export function MatchingTable({ results, onChange }: Props) {
  const [manualInputs, setManualInputs] = useState<Record<number, string>>({});

  function handleCandidateSelect(index: number, code: string) {
    const updated = results.map((r, i) => {
      if (i !== index) return r;
      const matched = r.candidates.find(c => c.code === code) || null;
      return { ...r, matchedCatalog: matched, status: 'exact' as const };
    });
    onChange(updated);
  }

  function handleManualInput(index: number, value: string) {
    setManualInputs(prev => ({ ...prev, [index]: value }));
    const updated = results.map((r, i) => {
      if (i !== index) return r;
      const manual: CatalogItem = { code: 'MANUAL', name: value, spec: r.item.spec, unit: r.item.unit, unitPrice: 0 };
      return { ...r, matchedCatalog: manual };
    });
    onChange(updated);
  }

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Flex style={{ padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '0.5rem' }}>
        {['品番', '品名', '規格', '数量', '単位', 'ステータス', 'マッチング結果'].map(h => (
          <Text key={h} size="1" weight="bold" style={{ color: 'var(--gray-10)', flex: h === 'マッチング結果' ? 2 : 1 }}>
            {h}
          </Text>
        ))}
      </Flex>

      {results.map((result, i) => (
        <Flex
          key={i}
          align="center"
          style={{
            padding: '0.75rem 1rem',
            background: STATUS_COLOR[result.status],
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '8px',
            marginBottom: '4px',
          }}
        >
          <Text size="1" style={{ flex: 1, color: 'var(--gray-11)', fontFamily: 'monospace' }}>{result.item.code}</Text>
          <Text size="1" style={{ flex: 1, color: '#e8eaf6' }}>{result.item.name}</Text>
          <Text size="1" style={{ flex: 1, color: 'var(--gray-11)' }}>{result.item.spec}</Text>
          <Text size="1" style={{ flex: 1, color: 'var(--gray-11)' }}>{result.item.quantity}</Text>
          <Text size="1" style={{ flex: 1, color: 'var(--gray-11)' }}>{result.item.unit}</Text>
          <Text size="1" style={{ flex: 1, color: result.status === 'exact' ? '#00c864' : result.status === 'candidate' ? '#c8a000' : '#ff5050', fontWeight: 'bold' }}>
            {STATUS_LABEL[result.status]}
          </Text>
          <Box style={{ flex: 2 }}>
            {result.status === 'exact' && (
              <Text size="1" style={{ color: 'var(--gray-11)' }}>
                {result.matchedCatalog?.name} {result.matchedCatalog?.spec} ¥{result.matchedCatalog?.unitPrice}/
                {result.matchedCatalog?.unit}
              </Text>
            )}
            {result.status === 'candidate' && (
              <Select.Root onValueChange={v => handleCandidateSelect(i, v)}>
                <Select.Trigger placeholder="候補から選択..." style={{ width: '100%', fontSize: '12px' }} />
                <Select.Content>
                  {result.candidates.map(c => (
                    <Select.Item key={c.code} value={c.code}>
                      {c.name} {c.spec} ¥{c.unitPrice}/{c.unit}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            )}
            {result.status === 'unregistered' && (
              <TextField.Root
                size="1"
                placeholder="品名を手動入力..."
                value={manualInputs[i] || ''}
                onChange={e => handleManualInput(i, e.target.value)}
                style={{ background: 'rgba(255,80,80,0.1)', border: '1px solid rgba(255,80,80,0.3)' }}
              />
            )}
          </Box>
        </Flex>
      ))}
    </Box>
  );
}
```

**Step 2: `components/EstimateWizard.tsx` を作成**

5ステップのウィザード全体を管理するコンポーネント。コードが長いため要点のみ記載し、各Stepを関数コンポーネントとして定義する。

```tsx
'use client';

import { useState } from 'react';
import { Box, Flex, Text, Heading, Button, TextField } from '@radix-ui/themes';
import { MatchingTable } from './MatchingTable';
import { MatchResult } from '@/lib/matching-engine';

// ---- 型定義 ----
interface Project {
  name: string;
  date: string;
  developer: string;
}

interface Params {
  markupRate: number;
  processingFee: number;
  overheadRate: number;
  discountRate: number;
}

// ---- ステップインジケーター ----
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <Flex gap="2" align="center" style={{ marginBottom: '2rem' }}>
      {Array.from({ length: total }).map((_, i) => (
        <Box key={i} style={{
          width: i === current ? '32px' : '8px',
          height: '8px',
          borderRadius: '4px',
          background: i <= current ? '#059669' : 'rgba(255,255,255,0.15)',
          transition: 'all 0.3s',
        }} />
      ))}
      <Text size="2" style={{ color: 'var(--gray-10)', marginLeft: '0.5rem' }}>
        {current + 1} / {total}
      </Text>
    </Flex>
  );
}

// ---- メインウィザード ----
export function EstimateWizard() {
  const [step, setStep] = useState(0);
  const [project, setProject] = useState<Project>({ name: '', date: '', developer: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [params, setParams] = useState<Params>({ markupRate: 1.2, processingFee: 50000, overheadRate: 0.1, discountRate: 0.05 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function runMatching() {
    setIsLoading(true);
    setError('');
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      const res = await fetch('/api/estimate-match', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('マッチング失敗');
      const data = await res.json();
      setMatchResults(data.results);
      setStep(2);
    } catch {
      setError('Excelの解析に失敗しました。ファイル形式を確認してください。');
    } finally {
      setIsLoading(false);
    }
  }

  async function downloadExcel() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/estimate-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: matchResults, params: {
          projectName: project.name,
          date: project.date,
          developerName: project.developer,
          ...params,
        }}),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimate-${project.name}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Box>
      <StepIndicator current={step} total={5} />

      {/* Step 0: プロジェクト登録 */}
      {step === 0 && (
        <Box>
          <Heading size="5" style={{ color: '#e8eaf6', marginBottom: '1.5rem' }}>プロジェクト登録</Heading>
          <Flex direction="column" gap="4" style={{ maxWidth: '480px' }}>
            <Box>
              <Text size="2" style={{ color: 'var(--gray-10)', display: 'block', marginBottom: '0.5rem' }}>現場名</Text>
              <TextField.Root value={project.name} onChange={e => setProject(p => ({ ...p, name: e.target.value }))} placeholder="例：○○マンション" />
            </Box>
            <Box>
              <Text size="2" style={{ color: 'var(--gray-10)', display: 'block', marginBottom: '0.5rem' }}>工事日付</Text>
              <TextField.Root type="date" value={project.date} onChange={e => setProject(p => ({ ...p, date: e.target.value }))} />
            </Box>
            <Box>
              <Text size="2" style={{ color: 'var(--gray-10)', display: 'block', marginBottom: '0.5rem' }}>デベロッパー名</Text>
              <TextField.Root value={project.developer} onChange={e => setProject(p => ({ ...p, developer: e.target.value }))} placeholder="例：佐藤建設" />
            </Box>
            <Button
              disabled={!project.name || !project.date}
              onClick={() => setStep(1)}
              style={{ background: '#059669', marginTop: '1rem' }}
            >
              次へ
            </Button>
          </Flex>
        </Box>
      )}

      {/* Step 1: Excelアップロード */}
      {step === 1 && (
        <Box>
          <Heading size="5" style={{ color: '#e8eaf6', marginBottom: '1.5rem' }}>拾い表Excelアップロード</Heading>
          <Flex direction="column" gap="4" style={{ maxWidth: '600px' }}>
            <Box
              style={{
                padding: '2rem', border: '2px dashed rgba(5,150,105,0.4)',
                borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
              }}
              onClick={() => document.getElementById('excel-input')?.click()}
            >
              <Text size="3" style={{ color: 'var(--gray-10)' }}>
                {files.length > 0
                  ? files.map(f => f.name).join(', ')
                  : 'クリックしてExcelファイルを選択（複数可）'
                }
              </Text>
              <input
                id="excel-input"
                type="file"
                accept=".xlsx,.xls"
                multiple
                style={{ display: 'none' }}
                onChange={e => setFiles(Array.from(e.target.files || []))}
              />
            </Box>
            {error && <Text size="2" style={{ color: '#ff5050' }}>{error}</Text>}
            <Flex gap="3">
              <Button variant="outline" onClick={() => setStep(0)} style={{ color: 'var(--gray-10)' }}>戻る</Button>
              <Button
                disabled={files.length === 0 || isLoading}
                onClick={runMatching}
                style={{ background: '#059669', flex: 1 }}
              >
                {isLoading ? 'AI解析中...' : 'AIマッチング開始'}
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}

      {/* Step 2: AIマッチング確認 */}
      {step === 2 && (
        <Box>
          <Flex justify="between" align="center" style={{ marginBottom: '1.5rem' }}>
            <Heading size="5" style={{ color: '#e8eaf6' }}>AIマッチング確認</Heading>
            <Flex gap="3" align="center">
              <Text size="1" style={{ color: '#00c864' }}>■ 一致</Text>
              <Text size="1" style={{ color: '#c8a000' }}>■ 候補あり</Text>
              <Text size="1" style={{ color: '#ff5050' }}>■ 未登録</Text>
            </Flex>
          </Flex>
          <MatchingTable results={matchResults} onChange={setMatchResults} />
          <Flex gap="3" style={{ marginTop: '1.5rem' }}>
            <Button variant="outline" onClick={() => setStep(1)} style={{ color: 'var(--gray-10)' }}>戻る</Button>
            <Button onClick={() => setStep(3)} style={{ background: '#059669' }}>全て確定・次へ</Button>
          </Flex>
        </Box>
      )}

      {/* Step 3: パラメータ設定 */}
      {step === 3 && (
        <Box>
          <Heading size="5" style={{ color: '#e8eaf6', marginBottom: '1.5rem' }}>見積もりパラメータ設定</Heading>
          <Flex direction="column" gap="4" style={{ maxWidth: '480px' }}>
            {[
              { label: '掛率', key: 'markupRate', placeholder: '1.2' },
              { label: '加工費（円）', key: 'processingFee', placeholder: '50000' },
              { label: '経費率（0〜1）', key: 'overheadRate', placeholder: '0.1' },
              { label: '値引き率（0〜1）', key: 'discountRate', placeholder: '0.05' },
            ].map(({ label, key, placeholder }) => (
              <Box key={key}>
                <Text size="2" style={{ color: 'var(--gray-10)', display: 'block', marginBottom: '0.5rem' }}>{label}</Text>
                <TextField.Root
                  type="number"
                  value={String(params[key as keyof Params])}
                  onChange={e => setParams(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                  placeholder={placeholder}
                />
              </Box>
            ))}
            <Flex gap="3" style={{ marginTop: '1rem' }}>
              <Button variant="outline" onClick={() => setStep(2)} style={{ color: 'var(--gray-10)' }}>戻る</Button>
              <Button onClick={() => setStep(4)} style={{ background: '#059669', flex: 1 }}>プレビューへ</Button>
            </Flex>
          </Flex>
        </Box>
      )}

      {/* Step 4: プレビュー・Excel出力 */}
      {step === 4 && (
        <Box>
          <Heading size="5" style={{ color: '#e8eaf6', marginBottom: '1.5rem' }}>プレビュー・Excel出力</Heading>
          <Box style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', maxWidth: '480px' }}>
            <Flex direction="column" gap="2">
              <Text size="2" style={{ color: 'var(--gray-10)' }}>現場名：<span style={{ color: '#e8eaf6' }}>{project.name}</span></Text>
              <Text size="2" style={{ color: 'var(--gray-10)' }}>工事日：<span style={{ color: '#e8eaf6' }}>{project.date}</span></Text>
              <Text size="2" style={{ color: 'var(--gray-10)' }}>品目数：<span style={{ color: '#e8eaf6' }}>{matchResults.length} 件</span></Text>
              <Text size="2" style={{ color: 'var(--gray-10)' }}>一致：<span style={{ color: '#00c864' }}>{matchResults.filter(r => r.status === 'exact').length} 件</span>　候補：<span style={{ color: '#c8a000' }}>{matchResults.filter(r => r.status === 'candidate').length} 件</span>　未登録：<span style={{ color: '#ff5050' }}>{matchResults.filter(r => r.status === 'unregistered').length} 件</span></Text>
            </Flex>
          </Box>
          <Flex gap="3">
            <Button variant="outline" onClick={() => setStep(3)} style={{ color: 'var(--gray-10)' }}>戻る</Button>
            <Button
              onClick={downloadExcel}
              disabled={isLoading}
              style={{ background: '#059669' }}
            >
              {isLoading ? '生成中...' : 'Excelをダウンロード'}
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
```

**Step 3: `app/estimate/page.tsx` を作成**

```tsx
import { Box, Flex, Text, Heading } from '@radix-ui/themes';
import Link from 'next/link';
import { EstimateWizard } from '@/components/EstimateWizard';

export default function EstimatePage() {
  return (
    <Box style={{ minHeight: '100vh', background: '#0a0a0f', padding: '2rem' }}>
      <Flex justify="between" align="center" style={{ marginBottom: '2rem' }}>
        <Box>
          <Text size="1" style={{ color: '#059669', fontFamily: 'monospace', display: 'block' }}>DEMO 03</Text>
          <Heading size="6" style={{ color: '#e8eaf6' }}>見積書生成</Heading>
          <Text size="2" style={{ color: 'var(--gray-10)' }}>
            拾い表ExcelをアップロードするとAIが自動で単価マッチング・見積書Excelを生成します
          </Text>
        </Box>
        <Link href="/" style={{ color: 'var(--gray-9)', fontSize: '14px' }}>← トップへ</Link>
      </Flex>

      <EstimateWizard />
    </Box>
  );
}
```

**Step 4: 動作確認**

http://localhost:3000/estimate にアクセスし、Step0〜4のウィザードが動くことを確認。

**Step 5: コミット**

```bash
git add app/estimate/ components/EstimateWizard.tsx components/MatchingTable.tsx
git commit -m "Rebro AIデモ v2：デモ③見積書生成ページを実装"
```

---

## Task 14: ビルド確認と最終動作検証

**Step 1: 本番ビルド**

```bash
cd dev/demo/rebro/webapp
npm run build
```

Expected: エラーなし。`Route (app)` の一覧に `/scale`, `/guide`, `/estimate` が表示される。

**Step 2: 型チェック**

```bash
npx tsc --noEmit
```

Expected: エラーなし

**Step 3: 全デモの動作確認チェックリスト**

- [ ] http://localhost:3000 → 3デモカードが表示される
- [ ] http://localhost:3000/scale → Step1〜4が動作、Step4にチェックボックスあり
- [ ] http://localhost:3000/guide → チャットがストリーミング表示、ステップカードが出る
- [ ] http://localhost:3000/estimate → Step0〜4のウィザードが動作、Excelダウンロードできる

**Step 4: 最終コミット**

```bash
git add -A
git commit -m "Rebro AIデモ v2：全機能実装完了・ビルド確認済み"
```
