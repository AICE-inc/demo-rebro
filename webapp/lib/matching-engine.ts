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
  confidence: number;
}

function matchByCode(item: ParsedItem, catalog: CatalogItem[]): CatalogItem | null {
  return catalog.find(c => c.code === item.code) || null;
}

function matchByKeyword(item: ParsedItem, catalog: CatalogItem[]): CatalogItem[] {
  return catalog.filter(c => {
    const nameMatch = item.name && c.name.includes(item.name.substring(0, 4));
    const specMatch = item.spec && c.spec === item.spec;
    return nameMatch && specMatch;
  });
}

function matchByPartialName(item: ParsedItem, catalog: CatalogItem[]): CatalogItem[] {
  if (!item.name) return [];
  return catalog.filter(c =>
    c.name.includes(item.name.substring(0, 3)) || item.name.includes(c.name.substring(0, 3))
  );
}

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
  const needsClaude: { item: ParsedItem; index: number }[] = [];

  const prelimResults = items.map((item, index) => {
    const exactByCode = matchByCode(item, catalog);
    if (exactByCode) {
      return { item, status: 'exact' as MatchStatus, matchedCatalog: exactByCode, candidates: [], confidence: 1.0 };
    }

    const keywordMatches = matchByKeyword(item, catalog);
    if (keywordMatches.length === 1) {
      return { item, status: 'exact' as MatchStatus, matchedCatalog: keywordMatches[0], candidates: [], confidence: 0.95 };
    }
    if (keywordMatches.length > 1) {
      return { item, status: 'candidate' as MatchStatus, matchedCatalog: null, candidates: keywordMatches.slice(0, 3), confidence: 0.85 };
    }

    needsClaude.push({ item, index });
    return null;
  });

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

    const partialMatches = matchByPartialName(item, catalog);
    if (partialMatches.length > 0) {
      results.push({ item, status: 'candidate', matchedCatalog: null, candidates: partialMatches.slice(0, 3), confidence: 0.5 });
      return;
    }

    results.push({ item, status: 'unregistered', matchedCatalog: null, candidates: [], confidence: 0 });
  });

  return results;
}
