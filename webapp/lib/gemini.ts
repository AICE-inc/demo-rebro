export interface DimensionResult {
  dimensions: string[];
  rawText: string;
}

/**
 * Gemini Vision API で画像から寸法数値を抽出する
 */
export async function extractDimensions(imageBase64: string): Promise<DimensionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const prompt = `あなたは建築設備図面の解析専門家です。
この図面画像から、記載されているすべての寸法数値を抽出してください。

抽出ルール：
- 数値と単位のセット（例：「5,300mm」「2,400mm」「1,820mm」）をすべて抽出
- 単位がない場合も数値のみ抽出（例：「5300」「2400」）
- 寸法線の矢印付近の数値を優先
- 重複する数値は1つだけ含める

必ず以下の厳密なJSONのみを出力してください（説明文不要）:
{
  "dimensions": ["5,300 mm", "2,400 mm", "1,820 mm"]
}`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/png', data: imageBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 }
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini returned no JSON');

  const parsed = JSON.parse(match[0].replace(/,(\s*[}\]])/g, '$1'));

  return {
    dimensions: parsed.dimensions ?? [],
    rawText,
  };
}

// 配管系統ごとの詳細情報
export interface PipeSystem {
  type: string;           // 例: "給水", "給湯", "追焚", "排水", "雑排水"
  mainDiameter: string;  // 例: "16φ", "20φ"
  branchDiameter: string; // 例: "13φ"
  material: string;      // 例: "ポリブデン管", "塩ビ管(HT-DV)"
  routing: string;       // 例: "床配管(SL±0)", "天井配管", "転がし配管"
}

// 接続器具の詳細情報
export interface FixtureDetail {
  name: string;          // 例: "洗面台", "トイレ", "キッチン", "UB", "洗濯機パン"
  count: number;
  slLevel: string;       // 例: "SL+1000", "SL+500" — アイソメ図から読み取る床高さ
  drainDiameter: string; // 例: "40φ", "75φ" — 排水管径
}

// 現場固有ルール（図面の注記から抽出）
export interface SiteRule {
  category: string;      // 例: "MB補足", "ソケット挿入", "段差スラブ", "SK系統"
  description: string;   // 例: "パイプ2m超でソケット(継手)が必要"
  value: string;         // 例: "2000mm", "パターン①②"
}

// AIが答えられない・人間に確認が必要な事項
export interface UncertainItem {
  item: string;          // 例: "MB内補足配管長", "段差スラブパターン選択"
  reason: string;        // 例: "図面上に記載なし", "現場判断が必要"
  suggestedQuestion: string; // 作業者への確認質問文
}

export interface DrawingInfo {
  drawingType: string;          // 例: "平面図(給水給湯)", "アイソメ図(排水)", "設計図"
  pipeSystems: PipeSystem[];    // 配管系統ごとの詳細
  fixtures: FixtureDetail[];    // 接続器具一覧
  scaleDimension: string;       // 縮尺基準寸法 例: "5,300mm"
  siteRules: SiteRule[];        // 現場固有ルール（注記から抽出）
  uncertainItems: UncertainItem[]; // AIが答えられない事項（人間への確認リスト）
  rawText: string;
}

export async function extractDrawingInfo(imageBase64: string): Promise<DrawingInfo> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

  const prompt = `あなたは建築設備（給排水衛生設備）の見積り拾い専門家です。
この配管図面から、見積り拾いに必要な情報を詳細に抽出してください。

## 抽出する情報

### 1. 図面種別
この図面が何の図面か判定してください：
- 設計図（建築設計事務所が作成した元図）
- 平面図・給水給湯（Rebroで作図した給水・給湯・追焚の平面配管図）
- 平面図・排水（Rebroで作図した排水の平面配管図）
- アイソメ図・給水給湯（3D配管系統図）
- アイソメ図・排水（3D配管系統図）

### 2. 配管系統ごとの詳細（pipeSystems）
以下を系統（給水・給湯・追焚・排水・雑排水）ごとに抽出：
- 主管の管径（例：16φ、20φ）
- 枝管の管径（例：13φ）
- 材質（ポリブデン管、塩ビ管、HT-DV耐熱管など。図面の仕様表があれば優先）
- 配管方式（床配管・天井配管・転がし配管）

### 3. 接続器具の詳細（fixtures）
器具ごとに以下を抽出：
- 器具名（洗面台・トイレ・UB＝ユニットバス・キッチン・洗濯機パン・台所シンク等）
- 数量
- SLレベル（アイソメ図があれば器具の接続高さ。例：SL+1000、SL+500）
- 排水管径（設計図の仕様表から。例：トイレ75φ、台所40φ）

### 4. 縮尺基準寸法（scaleDimension）
図面に記載されている縮尺合わせ用の基準寸法を抽出（例：「5,300mm」「6,900mm」）

### 5. 現場固有ルール（siteRules）
図面内の吹き出し・注記・コメントから以下を抽出：
- パイプ長2m超でのソケット（継手）挿入ルール
- 段差スラブ乗り越えパターン（パターン①②など）
- MB（メーターボックス）内の省略ルール
- SK系統（外部排水）の扱い
- UBの曲がり用継手の特記（「図面記載なくても必要」など）
- 特殊継手の指定（サニタリーベンド不要・エルボ代替など）

### 6. AIが答えられない事項（uncertainItems）
図面から読み取れない・現場判断が必要な事項をリストアップし、作業者への確認質問を生成：
- 記載のないMB内補足配管長
- 段差スラブパターンの選択（どちらを採用するか）
- SK系統の住戸内排水接続の有無
- HT-DV耐熱継手の適用範囲（食洗機の有無）
- サニタリーベンド or エルボの採用判断

## 出力形式

必ず以下の厳密なJSONのみを出力してください（説明文・マークダウン記法不要）:
{
  "drawingType": "平面図(給水給湯)",
  "pipeSystems": [
    {
      "type": "給水",
      "mainDiameter": "16φ",
      "branchDiameter": "13φ",
      "material": "ポリブデン管",
      "routing": "床配管(SL±0)"
    }
  ],
  "fixtures": [
    {
      "name": "洗面台",
      "count": 1,
      "slLevel": "SL+1000",
      "drainDiameter": "40φ"
    }
  ],
  "scaleDimension": "5,300mm",
  "siteRules": [
    {
      "category": "ソケット挿入",
      "description": "パイプ寸法が2000mm(2m)以上は路線便で運べないので間にソケット(継手)が必要",
      "value": "2000mm超"
    }
  ],
  "uncertainItems": [
    {
      "item": "MB内補足配管長",
      "reason": "図面上にMB内の配管が省略されている",
      "suggestedQuestion": "メーターボックス内に入ってからの補足配管長は何mとして計算しますか？（例：+0.5m）"
    }
  ]
}

読み取れない項目は空文字・空配列・0を使用してください。不明な場合は推測せず uncertainItems に追加してください。`;

  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/png', data: imageBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${err}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  const match = rawText.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Gemini returned no JSON');

  const parsed = JSON.parse(match[0].replace(/,(\s*[}\]])/g, '$1'));

  return {
    drawingType: parsed.drawingType ?? '',
    pipeSystems: parsed.pipeSystems ?? [],
    fixtures: parsed.fixtures ?? [],
    scaleDimension: parsed.scaleDimension ?? '',
    siteRules: parsed.siteRules ?? [],
    uncertainItems: parsed.uncertainItems ?? [],
    rawText,
  };
}
