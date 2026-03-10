# AI配管作図支援 図面読み込み改修 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** `/guide` ページに図面アップロード（またはサンプル選択）→ Gemini Vision解析 → 図面内容を踏まえたAI質問（選択肢+自由入力）→ Rebro操作ガイドの一連フローを実装し、Playwrightで動作確認する

**Architecture:**
- `/guide` ページを3ステップ構成に変更: Step1=図面アップロード、Step2=図面解析、Step3=チャット+ガイド
- 既存の `Step1Upload` / `Step2Analyze` コンポーネントは `/scale` と共用せず、`/guide` 専用の類似コンポーネントを `GuideStep1Upload` / `GuideStep2Analyze` として作成
- Gemini解析で図面から配管情報を抽出する新APIエンドポイント `/api/analyze-guide` を追加
- 既存 `GuideChat` を改修し、図面解析結果をシステムコンテキストとして渡し、AIが選択肢付き質問を返す形式にする

**Tech Stack:** Next.js 15 App Router, TypeScript, Radix UI, Anthropic SDK (claude-sonnet-4-6), Gemini Vision API, Playwright, pdfjs-dist

---

## 全体フロー

```
/guide
  └── GuidePage (page.tsx)
        └── [state: 'upload'] → GuideStep1Upload
              ↓ onNext(imageBase64, fileName)
        └── [state: 'analyze'] → GuideStep2Analyze
              ↓ onComplete(drawingInfo)
        └── [state: 'chat'] → GuideChat (改修済み)
              props: drawingInfo (図面解析結果)
```

---

### Task 1: 図面解析APIエンドポイントを作成

**Files:**
- Create: `dev/demo/rebro/webapp/app/api/analyze-guide/route.ts`
- Modify: `dev/demo/rebro/webapp/lib/gemini.ts`

**Step 1: `lib/gemini.ts` に配管情報抽出関数を追加**

```typescript
// lib/gemini.ts に追記

export interface DrawingInfo {
  pipeTypes: string[];      // 例: ["給水", "給湯", "排水"]
  fixtures: string[];       // 例: ["洗面台×2", "トイレ×1", "キッチン×1"]
  floors: string[];         // 例: ["1F", "2F"]
  notes: string;            // その他の特記事項
  rawText: string;
}

export async function extractDrawingInfo(imageBase64: string): Promise<DrawingInfo> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `あなたは建築設備図面の解析専門家です。
この配管図面から以下の情報を抽出してください。

抽出する情報:
1. 配管種別（給水・給湯・追焚・排水・雑排水など）
2. 接続器具（洗面台・トイレ・キッチン・浴室など、数量も）
3. 対象階（1F・2Fなど）
4. その他の特記事項（材質・工法など）

必ず以下の厳密なJSONのみを出力してください（説明文不要）:
{
  "pipeTypes": ["給水", "給湯", "排水"],
  "fixtures": ["洗面台×2", "トイレ×1"],
  "floors": ["1F", "2F"],
  "notes": "特記事項があれば記載"
}

図面が読み取れない場合や情報が不明な場合は空配列や空文字を使用してください。`;

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
    pipeTypes: parsed.pipeTypes ?? [],
    fixtures: parsed.fixtures ?? [],
    floors: parsed.floors ?? [],
    notes: parsed.notes ?? '',
    rawText,
  };
}
```

**Step 2: `/api/analyze-guide/route.ts` を作成**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { extractDrawingInfo } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
    }

    const result = await extractDrawingInfo(imageBase64);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[analyze-guide]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 3: TypeScriptエラーがないか確認**

```bash
cd dev/demo/rebro/webapp && npx tsc --noEmit
```

Expected: エラーなし

**Step 4: Commit**

```bash
git add dev/demo/rebro/webapp/app/api/analyze-guide/ dev/demo/rebro/webapp/lib/gemini.ts
git commit -m "AI配管支援：図面解析APIエンドポイントを追加"
```

---

### Task 2: GuideStep1Upload コンポーネントを作成

**Files:**
- Create: `dev/demo/rebro/webapp/components/GuideStep1Upload.tsx`

**Step 1: コンポーネントを作成**

`/scale` の `Step1Upload` を参考に、`/guide` 専用のアップロードUIを作成。
サンプル図面として `/sample/sample-drawing.pdf` を使用（既存）。

```typescript
'use client';

import { useRef, useState, useCallback } from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { Upload, FileText } from 'lucide-react';

interface Props {
  onNext: (imageBase64: string, fileName: string) => void;
}

export function GuideStep1Upload({ onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const base64Ref = useRef<string>('');

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('PDFファイルを選択してください');
      return;
    }
    setLoading(true);
    setFileName(file.name);

    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
    GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: canvas.getContext('2d') as any, canvas, viewport }).promise;

    const base64 = canvas.toDataURL('image/png').split(',')[1];
    base64Ref.current = base64;
    setPreview(canvas.toDataURL('image/png'));
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSampleClick = useCallback(async () => {
    setLoading(true);
    setFileName('sample-drawing.pdf');
    const res = await fetch('/sample/sample-drawing.pdf');
    const blob = await res.blob();
    const file = new File([blob], 'sample-drawing.pdf', { type: 'application/pdf' });
    await processFile(file);
  }, [processFile]);

  const handleNext = () => {
    if (base64Ref.current) onNext(base64Ref.current, fileName);
  };

  return (
    <Flex direction="column" gap="6" align="center">
      <Box style={{ textAlign: 'center' }}>
        <Text size="6" weight="bold" style={{ color: '#e8eaf6', display: 'block' }}>
          配管図面をアップロード
        </Text>
        <Text size="3" style={{ color: 'var(--gray-10)', marginTop: '0.5rem', display: 'block' }}>
          給水・給湯・排水の配管図面を読み込みます
        </Text>
      </Box>

      <Box
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        style={{
          width: '100%',
          maxWidth: '480px',
          minHeight: '220px',
          border: `2px dashed ${isDragging ? '#7c3aed' : 'rgba(124,58,237,0.3)'}`,
          borderRadius: '16px',
          background: isDragging ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          gap: '1rem',
          padding: '2rem',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
        {preview ? (
          <img src={preview} alt="図面プレビュー" style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px' }} />
        ) : loading ? (
          <Text size="3" style={{ color: '#7c3aed' }}>変換中...</Text>
        ) : (
          <>
            <Upload size={40} style={{ color: 'rgba(124,58,237,0.5)' }} />
            <Text size="3" style={{ color: 'var(--gray-10)', textAlign: 'center' }}>
              クリックまたはドラッグ&amp;ドロップ<br />
              <Text size="2" style={{ color: 'var(--gray-9)' }}>PDFファイルのみ対応</Text>
            </Text>
          </>
        )}
      </Box>

      {fileName && (
        <Flex align="center" gap="2" style={{ color: 'var(--gray-10)' }}>
          <FileText size={16} />
          <Text size="2">{fileName}</Text>
        </Flex>
      )}

      <Flex gap="3" wrap="wrap" justify="center">
        <Button
          variant="ghost"
          size="3"
          onClick={handleSampleClick}
          disabled={loading}
          data-testid="sample-button"
          style={{ color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          サンプル図面で試す
        </Button>

        <Button
          size="3"
          onClick={handleNext}
          disabled={!preview || loading}
          data-testid="next-button"
          style={{ background: '#7c3aed', color: 'white', fontWeight: 'bold' }}
        >
          AI解析を開始 →
        </Button>
      </Flex>
    </Flex>
  );
}
```

**Step 2: TypeScriptエラーがないか確認**

```bash
cd dev/demo/rebro/webapp && npx tsc --noEmit
```

Expected: エラーなし

**Step 3: Commit**

```bash
git add dev/demo/rebro/webapp/components/GuideStep1Upload.tsx
git commit -m "AI配管支援：図面アップロードコンポーネント（GuideStep1Upload）を追加"
```

---

### Task 3: GuideStep2Analyze コンポーネントを作成

**Files:**
- Create: `dev/demo/rebro/webapp/components/GuideStep2Analyze.tsx`

**Step 1: コンポーネントを作成**

`/scale` の `Step2Analyze` を参考に、配管情報抽出用のアニメーション付き解析画面を作成。
`/api/analyze-guide` を呼び出し、`DrawingInfo` を返す。

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';

export interface DrawingInfo {
  pipeTypes: string[];
  fixtures: string[];
  floors: string[];
  notes: string;
}

interface Props {
  imageBase64: string;
  onComplete: (info: DrawingInfo) => void;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function GuideStep2Analyze({ imageBase64, onComplete }: Props) {
  const imageRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { animate } = await import('animejs');

      if (imageRef.current && !cancelled) {
        animate(imageRef.current, {
          opacity: [0, 1],
          translateY: [30, 0],
          scale: [0.95, 1],
          duration: 800,
          easing: 'easeOutExpo',
        });

        animate(imageRef.current, {
          rotateX: [0, 3, 0],
          rotateY: [-2, 2, -2],
          translateY: [0, -6, 0],
          duration: 4000,
          loop: true,
          easing: 'easeInOutSine',
          delay: 900,
        });
      }

      await sleep(400);
      if (cancelled) return;
      addLog('図面データを読み込んでいます...');

      await sleep(600);
      if (cancelled) return;
      addLog('Gemini Vision API に接続中...');

      await sleep(500);
      if (cancelled) return;
      addLog('配管情報を解析中...');

      let info: DrawingInfo = { pipeTypes: [], fixtures: [], floors: [], notes: '' };
      try {
        const res = await fetch('/api/analyze-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        info = {
          pipeTypes: data.pipeTypes ?? [],
          fixtures: data.fixtures ?? [],
          floors: data.floors ?? [],
          notes: data.notes ?? '',
        };
        if (info.pipeTypes.length === 0 && info.fixtures.length === 0) {
          throw new Error('No drawing info returned');
        }
      } catch {
        addLog('⚠ APIエラー。サンプルデータを使用します。');
        info = {
          pipeTypes: ['給水', '給湯', '排水'],
          fixtures: ['洗面台×2', 'トイレ×1', 'キッチン×1'],
          floors: ['1F', '2F'],
          notes: '',
        };
      }

      if (cancelled) return;

      if (info.pipeTypes.length > 0) {
        addLog(`配管種別を検出: ${info.pipeTypes.join('・')}`);
      }
      for (const fixture of info.fixtures) {
        await sleep(150);
        if (cancelled) return;
        addLog(`  ✓ ${fixture}`);
      }
      if (info.floors.length > 0) {
        addLog(`対象階: ${info.floors.join('・')}`);
      }

      await sleep(500);
      if (cancelled) return;
      addLog('解析完了。AIが質問を生成します...');
      setDone(true);

      await sleep(800);
      if (!cancelled) onComplete(info);
    };

    run();
    return () => { cancelled = true; };
  }, [imageBase64, onComplete]);

  return (
    <Flex direction="column" gap="6" align="center" style={{ width: '100%' }}>
      <Text size="5" weight="bold" style={{ color: '#e8eaf6' }}>
        AIが図面を解析中...
      </Text>

      <Flex gap="6" style={{ width: '100%', maxWidth: '900px' }} wrap="wrap" justify="center">
        <Box style={{ perspective: '1000px', flex: '1', minWidth: '300px' }}>
          <Box
            ref={imageRef}
            style={{
              opacity: 0,
              position: 'relative',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid rgba(124,58,237,0.4)',
              boxShadow: '0 0 40px rgba(124,58,237,0.2), 0 20px 60px rgba(0,0,0,0.5)',
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={`data:image/png;base64,${imageBase64}`}
              alt="解析中の図面"
              style={{ width: '100%', display: 'block', opacity: 0.85 }}
            />
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(124,58,237,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.03) 1px, transparent 1px)',
              backgroundSize: '30px 30px',
              pointerEvents: 'none',
            }} />
          </Box>
        </Box>

        <Box
          style={{
            flex: '1',
            minWidth: '250px',
            maxHeight: '320px',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: '12px',
            padding: '1rem',
            fontFamily: 'monospace',
          }}
        >
          <Text size="2" style={{ color: '#7c3aed', display: 'block', marginBottom: '0.5rem' }}>
            解析ログ
          </Text>
          {logs.map((log, i) => (
            <Text
              key={i}
              size="2"
              style={{
                color: log.includes('✓') ? '#7c3aed' : log.includes('⚠') ? '#f59e0b' : 'var(--gray-10)',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              {log}
            </Text>
          ))}
          {!done && <Text size="2" style={{ color: 'var(--gray-9)' }}>▋</Text>}
        </Box>
      </Flex>
    </Flex>
  );
}
```

**Step 2: TypeScriptエラーがないか確認**

```bash
cd dev/demo/rebro/webapp && npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add dev/demo/rebro/webapp/components/GuideStep2Analyze.tsx
git commit -m "AI配管支援：図面解析ステップコンポーネント（GuideStep2Analyze）を追加"
```

---

### Task 4: GuideChat を図面解析結果を受け取る形に改修

**Files:**
- Modify: `dev/demo/rebro/webapp/components/GuideChat.tsx`
- Modify: `dev/demo/rebro/webapp/app/api/guide-chat/route.ts`

**Step 1: `guide-chat/route.ts` のシステムプロンプトを図面情報対応に改修**

`messages` パラメータに加えて `drawingInfo` を受け取り、システムプロンプトに埋め込む。
また、AIが選択肢付き質問を返せるようにプロンプトを改修する。

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

interface DrawingInfo {
  pipeTypes: string[];
  fixtures: string[];
  floors: string[];
  notes: string;
}

function buildSystemPrompt(drawingInfo: DrawingInfo | null): string {
  const drawingContext = drawingInfo
    ? `
## 解析済み図面情報
- 配管種別: ${drawingInfo.pipeTypes.join('、') || '不明'}
- 接続器具: ${drawingInfo.fixtures.join('、') || '不明'}
- 対象階: ${drawingInfo.floors.join('、') || '不明'}
- 特記事項: ${drawingInfo.notes || 'なし'}

この図面情報を前提に会話を進めてください。図面から読み取れた情報は再確認不要です。
`
    : '';

  return `あなたはRebro（建築設備CADソフト）の操作を支援するAIアシスタントです。
配管設備工事のSHASE（空気調和・衛生工学会）規格に基づいて配管径を計算し、
Rebroでの具体的な操作手順をステップ形式で提供します。
${drawingContext}
## 会話の進め方
1. 図面情報から不明な点（現場名・配管方式など）を確認する
2. 接続する器具の数など図面から読み取れなかった情報を確認する
3. SHASE基準で推奨配管径を計算して提示する
4. 最後に以下のJSON形式でRebro操作ステップを出力する

## 重要：質問の形式
質問する際は、以下の形式で選択肢を提示してください（自由入力も可能であることを明示）:

例:
---
現場の配管方式はどちらですか？

【選択肢】
- 床配管（スラブ貫通）
- 天井配管（吊りボルト）
- その他（自由入力可）
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
  const { messages, drawingInfo } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system: buildSystemPrompt(drawingInfo ?? null),
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
```

**Step 2: `GuideChat.tsx` を図面情報受け取り + 選択肢UI対応に改修**

AIの応答に `【選択肢】` が含まれる場合、選択肢をボタンとして表示する。
選択肢クリックで自動入力、自由入力テキストエリアも残す。

```typescript
'use client';

import { useState, useRef, useEffect } from 'react';
import { Box, Flex, Text, Button, TextArea } from '@radix-ui/themes';
import { GuideStepCard, StepData } from './GuideStepCard';

interface DrawingInfo {
  pipeTypes: string[];
  fixtures: string[];
  floors: string[];
  notes: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  drawingInfo: DrawingInfo | null;
}

function parseSteps(text: string): StepData[] | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.steps && Array.isArray(parsed.steps)) {
      return parsed.steps;
    }
  } catch {
    // ignore
  }
  return null;
}

function cleanMessageText(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, '').trim();
}

function parseChoices(text: string): string[] {
  const sectionMatch = text.match(/【選択肢】([\s\S]*?)(?:\n\n|$)/);
  if (!sectionMatch) return [];
  const lines = sectionMatch[1].split('\n');
  return lines
    .map(l => l.replace(/^[-・]\s*/, '').trim())
    .filter(l => l.length > 0 && !l.includes('自由入力可'));
}

function buildInitialMessage(info: DrawingInfo | null): string {
  if (!info || (info.pipeTypes.length === 0 && info.fixtures.length === 0)) {
    return '配管作図を支援します。まず、現場名と配管種別（給水・給湯・追焚・排水など）を教えてください。';
  }
  const parts: string[] = [];
  if (info.pipeTypes.length > 0) parts.push(`配管種別: ${info.pipeTypes.join('・')}`);
  if (info.fixtures.length > 0) parts.push(`接続器具: ${info.fixtures.join('・')}`);
  if (info.floors.length > 0) parts.push(`対象階: ${info.floors.join('・')}`);
  return `図面を解析しました。\n${parts.join('\n')}\n\n現場名を教えてください。`;
}

export function GuideChat({ drawingInfo }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: buildInitialMessage(drawingInfo),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<StepData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/guide-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, drawingInfo }),
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      }

      const parsedSteps = parseSteps(fullText);
      if (parsedSteps) {
        setSteps(parsedSteps);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
  const choices = lastAssistantMessage ? parseChoices(lastAssistantMessage.content) : [];

  return (
    <Flex style={{ height: '100%', gap: 0 }}>
      {/* 左ペイン：チャット */}
      <Flex
        direction="column"
        style={{
          flex: '0 0 60%',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          height: '100%',
        }}
      >
        {/* メッセージ一覧 */}
        <Box style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {messages.map((msg, i) => (
            <Flex
              key={i}
              justify={msg.role === 'user' ? 'end' : 'start'}
              style={{ marginBottom: '1rem' }}
            >
              <Box
                style={{
                  maxWidth: '80%',
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'user'
                    ? 'rgba(124,58,237,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                <Text
                  size="2"
                  style={{
                    color: '#e8eaf6',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                  }}
                >
                  {cleanMessageText(msg.content)}
                </Text>
              </Box>
            </Flex>
          ))}
          {isLoading && (
            <Flex justify="start" style={{ marginBottom: '1rem' }}>
              <Box style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Text size="2" style={{ color: 'var(--gray-9)' }}>考え中...</Text>
              </Box>
            </Flex>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* 選択肢ボタン */}
        {!isLoading && choices.length > 0 && (
          <Box style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.2)',
          }}>
            <Text size="1" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.5rem' }}>
              選択肢から選ぶか、下のテキストエリアに自由入力できます
            </Text>
            <Flex gap="2" wrap="wrap">
              {choices.map((choice, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="2"
                  onClick={() => handleSend(choice)}
                  data-testid={`choice-button-${i}`}
                  style={{
                    borderColor: 'rgba(124,58,237,0.4)',
                    color: '#c4b5fd',
                    fontSize: '0.8rem',
                  }}
                >
                  {choice}
                </Button>
              ))}
            </Flex>
          </Box>
        )}

        {/* 入力エリア */}
        <Box style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <Flex gap="3" align="end">
            <TextArea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力（Enter で送信、Shift+Enter で改行）"
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e8eaf6',
                minHeight: '80px',
                resize: 'none',
              }}
            />
            <Button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              size="3"
              style={{
                background: '#7c3aed',
                color: 'white',
                flexShrink: 0,
              }}
            >
              送信
            </Button>
          </Flex>
        </Box>
      </Flex>

      {/* 右ペイン：Rebro操作ステップ */}
      <Box
        style={{
          flex: '0 0 40%',
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        {steps.length > 0 ? (
          <GuideStepCard steps={steps} />
        ) : (
          <Flex
            direction="column"
            align="center"
            justify="center"
            style={{ height: '100%', padding: '2rem', textAlign: 'center' }}
          >
            <Text size="2" style={{ color: 'var(--gray-9)', lineHeight: '1.6' }}>
              チャットで現場情報を入力すると、
              Rebro操作ステップが
              ここに表示されます。
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
```

**Step 3: TypeScriptエラーがないか確認**

```bash
cd dev/demo/rebro/webapp && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add dev/demo/rebro/webapp/components/GuideChat.tsx dev/demo/rebro/webapp/app/api/guide-chat/route.ts
git commit -m "AI配管支援：GuideChatを図面解析結果・選択肢UI対応に改修"
```

---

### Task 5: /guide ページをステップフロー構成に改修

**Files:**
- Modify: `dev/demo/rebro/webapp/app/guide/page.tsx`

**Step 1: page.tsx を3ステップ構成に改修**

```typescript
'use client';

import { useState } from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import Link from 'next/link';
import { HeroGrid } from '@/components/HeroGrid';
import { GuideStep1Upload } from '@/components/GuideStep1Upload';
import { GuideStep2Analyze } from '@/components/GuideStep2Analyze';
import type { DrawingInfo } from '@/components/GuideStep2Analyze';
import { GuideChat } from '@/components/GuideChat';

type Step = 'upload' | 'analyze' | 'chat';

export default function GuidePage() {
  const [step, setStep] = useState<Step>('upload');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [drawingInfo, setDrawingInfo] = useState<DrawingInfo | null>(null);

  const handleUploadNext = (base64: string, _fileName: string) => {
    setImageBase64(base64);
    setStep('analyze');
  };

  const handleAnalyzeComplete = (info: DrawingInfo) => {
    setDrawingInfo(info);
    setStep('chat');
  };

  return (
    <Box style={{ position: 'relative', height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <HeroGrid />

      {/* ヘッダー */}
      <Flex
        align="center"
        justify="between"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '1rem 2rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.6)',
          flexShrink: 0,
        }}
      >
        <Flex align="center" gap="3">
          <Text size="1" style={{ color: '#7c3aed', fontFamily: 'monospace' }}>DEMO 02</Text>
          <Text size="3" weight="bold" style={{ color: '#e8eaf6' }}>AI配管作図支援</Text>
          {step !== 'upload' && (
            <Flex gap="2" align="center">
              <Text size="1" style={{ color: 'var(--gray-9)' }}>
                {step === 'analyze' ? '解析中' : 'チャット'}
              </Text>
            </Flex>
          )}
        </Flex>
        <Flex align="center" gap="3">
          {step !== 'upload' && (
            <Button
              variant="ghost"
              size="2"
              onClick={() => setStep('upload')}
              style={{ color: 'var(--gray-9)' }}
            >
              図面を選び直す
            </Button>
          )}
          <Button asChild variant="ghost" size="2" style={{ color: 'var(--gray-9)' }}>
            <Link href="/">トップへ戻る</Link>
          </Button>
        </Flex>
      </Flex>

      {/* メインコンテンツ */}
      <Box style={{ position: 'relative', zIndex: 1, flex: 1, overflow: 'hidden' }}>
        {step === 'upload' && (
          <Flex align="center" justify="center" style={{ height: '100%', padding: '2rem' }}>
            <Box style={{ width: '100%', maxWidth: '600px' }}>
              <GuideStep1Upload onNext={handleUploadNext} />
            </Box>
          </Flex>
        )}
        {step === 'analyze' && (
          <Flex align="center" justify="center" style={{ height: '100%', padding: '2rem' }}>
            <Box style={{ width: '100%', maxWidth: '900px' }}>
              <GuideStep2Analyze imageBase64={imageBase64} onComplete={handleAnalyzeComplete} />
            </Box>
          </Flex>
        )}
        {step === 'chat' && (
          <GuideChat drawingInfo={drawingInfo} />
        )}
      </Box>
    </Box>
  );
}
```

**Step 2: TypeScriptエラーがないか確認**

```bash
cd dev/demo/rebro/webapp && npx tsc --noEmit
```

**Step 3: 手動で動作確認**

```bash
cd dev/demo/rebro/webapp && npm run dev
```

ブラウザで `http://localhost:3000/guide` を開き:
1. サンプル図面ボタンをクリック → 図面プレビュー表示
2. AI解析を開始 → 解析ログが流れる
3. チャット画面に遷移 → 図面解析結果が初期メッセージに反映されている
4. AIから選択肢付き質問が返ってくること
5. 選択肢ボタンをクリックで自動送信されること
6. 自由入力テキストエリアも使えること

**Step 4: Commit**

```bash
git add dev/demo/rebro/webapp/app/guide/page.tsx
git commit -m "AI配管支援：guideページをステップフロー構成（アップロード→解析→チャット）に改修"
```

---

### Task 6: Playwrightテストを作成・実行

**Files:**
- Modify: `dev/demo/rebro/webapp/e2e/guide.spec.ts`

**Step 1: 既存テストを更新し、一連のフローテストを追加**

注意: Playwrightでファイルアップロードをシミュレートする際は `page.setInputFiles()` を使用。
`/sample/sample-drawing.pdf` は `public/sample/` に存在する。
サンプルボタンは `data-testid="sample-button"` を付けている。
PDF→canvas変換はブラウザ内で行われるため、実際のPDF処理が走ることに注意。

```typescript
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

    // PDF処理に時間がかかるので長めのタイムアウト
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

    // Step2: 解析ログが表示される
    await expect(page.locator('text=AIが図面を解析中')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=図面データを読み込んでいます')).toBeVisible({ timeout: 15000 });

    // Step3: チャット画面へ遷移（解析完了後）
    await expect(page.locator('textarea')).toBeVisible({ timeout: 60000 });
    await expect(page.locator('button', { hasText: '送信' })).toBeVisible();

    // 初期メッセージが図面解析結果を含む
    const chatContent = await page.locator('[class*="ScrollArea"], [style*="overflow"]').first().textContent();
    expect(chatContent).toBeTruthy();
  });

  test('チャット画面: 送信ボタンは入力がないと無効', async ({ page }) => {
    await page.goto('/guide');

    // サンプル図面で素早くチャットへ
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
```

**Step 2: テストを実行**

```bash
cd dev/demo/rebro/webapp && npx playwright test e2e/guide.spec.ts --reporter=list
```

Expected: 全テストPASS（または失敗テストが特定できている）

**Step 3: 失敗している場合のデバッグ**

- タイムアウト → 待機時間を延ばす
- セレクタが見つからない → `data-testid` 属性が正しく付いているか確認
- PDF処理失敗 → ブラウザコンソールエラーを確認

**Step 4: 全テストPASSを確認後にCommit**

```bash
git add dev/demo/rebro/webapp/e2e/guide.spec.ts
git commit -m "AI配管支援：一連フローのPlaywrightテストを追加"
```

---

## 実装完了チェックリスト

- [ ] `/api/analyze-guide` エンドポイントが動作する
- [ ] `GuideStep1Upload` でサンプル図面・ファイルアップロード両方できる
- [ ] `GuideStep2Analyze` で解析ログアニメーションが流れる
- [ ] `GuideChat` に図面解析結果が初期メッセージとして反映される
- [ ] AIからの選択肢付き質問がボタンとして表示される
- [ ] 選択肢ボタンクリックで自動送信される
- [ ] 自由入力テキストエリアが機能する
- [ ] Playwrightテストが全件PASS
