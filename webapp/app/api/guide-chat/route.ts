import Anthropic from '@anthropic-ai/sdk';
import type { DrawingInfo } from '@/lib/gemini';

const client = new Anthropic();

function buildSystemPrompt(drawingInfo: DrawingInfo | null): string {
  const drawingContext = drawingInfo
    ? `
## 解析済み図面情報
- 図面種別: ${drawingInfo.drawingType || '不明'}
- 縮尺基準寸法: ${drawingInfo.scaleDimension || '不明'}
- 配管系統:
${drawingInfo.pipeSystems.map(p => `  - ${p.type}: 主管${p.mainDiameter}、枝管${p.branchDiameter}、${p.material}、${p.routing}`).join('\n') || '  なし'}
- 接続器具:
${drawingInfo.fixtures.map(f => `  - ${f.name}×${f.count}（SL: ${f.slLevel}、排水${f.drainDiameter}）`).join('\n') || '  なし'}
- 現場固有ルール:
${drawingInfo.siteRules.map(r => `  - [${r.category}] ${r.description}`).join('\n') || '  なし'}
- 要確認事項（人間への確認が必要）:
${drawingInfo.uncertainItems.map(u => `  - ${u.item}: ${u.suggestedQuestion}`).join('\n') || '  なし'}

この図面情報を前提に会話を進めてください。図面から読み取れた情報は再確認不要です。
要確認事項がある場合は、最初に順番に質問してから計算・提案に進んでください。
`
    : '';

  return `あなたはRebro（建築設備CADソフト）の操作を支援するAIアシスタントです。
配管設備工事のSHASE（空気調和・衛生工学会）規格に基づいて配管径を計算し、
Rebroでの具体的な操作手順をステップ形式で提供します。
${drawingContext}
## 会話の進め方
1. 要確認事項がある場合は**1つずつ**質問する（複数まとめて聞かない）
2. 全ての確認が取れたらSHASE基準で推奨配管径を計算して提示する
3. 最後に以下のJSON形式でRebro操作ステップを出力する

## 重要：出力はマークダウン形式で記述すること
- 見出しは ## や ### を使う
- 箇条書きは - を使う
- 強調は **テキスト** を使う
- 数値や配管径などはコードスパン形式で示す

## 重要：質問は必ず1つずつ行うこと
- 一度に複数の質問をしない
- 1つの回答を受け取ってから次の質問に進む
- 選択肢がある場合は以下の形式で提示する（自由入力も常に受け付ける）

質問の形式例:
---
現場の配管方式はどちらですか？

【選択肢】
- 床配管（スラブ貫通）
- 天井配管（吊りボルト）
---

## SHASE配管径計算基準（簡略版）
- 給水幹線：器具数3以下→13A、4〜8→20A、9〜20→25A、21以上→32A
- 給湯幹線：給水の1段階細い
- 排水：洗面台→40φ、トイレ→75φ、キッチン→50φ、複数→75〜100φ

## Rebro操作ステップのJSON出力形式
推奨配管径を提示した後、必ず以下のJSON形式でステップを出力してください：

\`\`\`json
{
  "steps": [
    { "id": 1, "title": "ステップのタイトル", "description": "詳細な操作説明" },
    ...
  ]
}
\`\`\`

このJSONはシステムが自動的に右ペインのステップカードとして表示します。`;
}

export async function POST(req: Request) {
  let body: { messages?: unknown; drawingInfo?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  const { messages, drawingInfo } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response('messages is required', { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: buildSystemPrompt((drawingInfo ?? null) as DrawingInfo | null),
          messages,
          stream: true,
        });

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        console.error('Guide chat error:', err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
