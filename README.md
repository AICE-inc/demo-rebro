# Rebro AI デモアプリケーション

Rebro（配管CADソフト）の業務を AI で補助する 3 つのデモツールをまとめた Next.js アプリです。

---

## 機能一覧

### Demo 01 - 縮尺合わせ
PDF の図面から寸法を自動抽出し、実際の建物寸法との縮尺比率を計算します。

- Gemini Vision API で図面画像から寸法候補を抽出
- ユーザーが基準寸法を選択し、縮尺比率を算出

### Demo 02 - AI 配管支援
配管図面をアップロードし、Claude との対話を通じて Rebro の操作手順を生成します。

- Gemini Vision API で図面から管種・器具・現場ルールを解析
- Claude (Sonnet 4.6) が SHASE 基準に基づく管径選定と Rebro 操作手順をストリーミング回答

### Demo 03 - 見積もり生成
Rebro 出力の Excel ファイルを読み込み、カタログとのマッチングを AI で行い、Excel 見積書を出力します。

- Rebro 出力 Excel のパース（給水・給湯・排水）
- Claude によるカタログマッチング（完全一致 → 候補 → 未登録の 3 段階）
- 掛け率・諸経費・値引きを含む Excel 見積書の自動生成

---

## 技術スタック

- **フレームワーク**: Next.js (App Router)
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)、Google Gemini Vision API
- **UI**: Tailwind CSS、Radix UI Themes、Lucide React
- **Excel 処理**: ExcelJS
- **PDF 処理**: pdfjs-dist
- **テスト**: Playwright (E2E)、Vitest (Unit)

---

## 環境変数

`.env.local` ファイルをプロジェクトルート (`webapp/`) に作成し、以下を設定してください。

```env
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```

| 変数名 | 取得元 |
|---|---|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) |

---

## ローカル開発

```bash
cd webapp
npm install
npm run dev
```

`http://localhost:3000` でアクセスできます。

---

## デプロイ手順（Vercel）

### 前提条件

- [Vercel アカウント](https://vercel.com/) および Vercel CLI のインストール
- GitHub リポジトリへのプッシュ済み

### 1. Vercel へのプロジェクト追加

Vercel ダッシュボードから **Add New Project** を選択し、このリポジトリをインポートします。

- **Root Directory**: `dev/demo/rebro/webapp`
- **Framework Preset**: Next.js（自動検出）

### 2. 環境変数の設定

Vercel の **Project Settings > Environment Variables** に以下を追加します。

| 変数名 | 説明 |
|---|---|
| `GEMINI_API_KEY` | Google Gemini Vision API キー |
| `ANTHROPIC_API_KEY` | Anthropic Claude API キー |

### 3. デプロイ

**Deploy** ボタンを押すとビルド・デプロイが開始します。以降は `main` ブランチへのプッシュで自動デプロイされます。

デプロイ設定は [webapp/vercel.json](webapp/vercel.json) で管理しています（リージョン: `hnd1` 東京）。

### CLI からのデプロイ

```bash
cd webapp
npx vercel --prod
```

---

## ディレクトリ構成

```
dev/demo/rebro/
└── webapp/
    ├── app/
    │   ├── page.tsx              # ホーム（デモ選択）
    │   ├── scale/                # Demo 01 縮尺合わせ
    │   ├── guide/                # Demo 02 AI 配管支援
    │   ├── estimate/             # Demo 03 見積もり生成
    │   └── api/                  # API ルート
    ├── components/               # UI コンポーネント
    ├── lib/                      # ユーティリティ（Gemini / マッチング / Excel）
    └── public/sample/            # サンプルファイル（Excel・カタログ）
```
