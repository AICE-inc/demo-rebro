'use client';

import { useState } from 'react';
import { Box, Flex, Text, Button, Select } from '@radix-ui/themes';
import { MatchResult, CatalogItem } from '@/lib/matching-engine';

interface Props {
  results: MatchResult[];
  onConfirm: (confirmed: ConfirmedMatch[]) => void;
}

export interface ConfirmedMatch {
  itemCode: string;
  catalogItem: CatalogItem | null;
  unitPrice: number;
}

const STATUS_COLOR = {
  exact: '#16a34a',
  candidate: '#d97706',
  unregistered: '#dc2626',
} as const;

const STATUS_LABEL = {
  exact: '一致',
  candidate: '候補あり',
  unregistered: '未登録',
} as const;

export function MatchingTable({ results, onConfirm }: Props) {
  const [selections, setSelections] = useState<Record<string, CatalogItem | null>>(() => {
    const init: Record<string, CatalogItem | null> = {};
    results.forEach(r => {
      init[r.item.code] = r.matchedCatalog;
    });
    return init;
  });

  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});

  const handleSelectCandidate = (code: string, catalogItem: CatalogItem | null) => {
    setSelections(prev => ({ ...prev, [code]: catalogItem }));
  };

  const handleManualPrice = (code: string, price: number) => {
    setManualPrices(prev => ({ ...prev, [code]: price }));
  };

  const handleConfirmAll = () => {
    const confirmed: ConfirmedMatch[] = results.map(r => {
      const catalog = selections[r.item.code];
      const unitPrice = catalog?.unitPrice ?? manualPrices[r.item.code] ?? 0;
      return { itemCode: r.item.code, catalogItem: catalog, unitPrice };
    });
    onConfirm(confirmed);
  };

  const confirmedCount = results.filter(r => {
    const sel = selections[r.item.code];
    return sel !== null || manualPrices[r.item.code] !== undefined;
  }).length;

  return (
    <Box>
      {/* 凡例 */}
      <Flex gap="4" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['exact', 'candidate', 'unregistered'] as const).map(status => (
          <Flex key={status} align="center" gap="2">
            <Box style={{ width: '12px', height: '12px', borderRadius: '50%', background: STATUS_COLOR[status] }} />
            <Text size="1" style={{ color: 'var(--gray-10)' }}>
              {STATUS_LABEL[status]}（{results.filter(r => r.status === status).length}件）
            </Text>
          </Flex>
        ))}
      </Flex>

      {/* テーブル */}
      <Box style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              {['状態', '品番', '品名/規格', '数量', '単位', '単価', '黄:候補を選択 / 赤:単価を手入力'].map(h => (
                <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left', color: 'var(--gray-9)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((r, idx) => {
              const selected = selections[r.item.code];
              return (
                <tr
                  key={`${r.item.code}-${idx}`}
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    background: r.status === 'unregistered' ? 'rgba(220,38,38,0.05)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    <Box style={{
                      display: 'inline-block',
                      width: '10px', height: '10px', borderRadius: '50%',
                      background: STATUS_COLOR[r.status],
                    }} />
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--gray-9)', fontFamily: 'monospace', fontSize: '11px' }}>
                    {r.item.code}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#e8eaf6' }}>
                    {r.item.name} {r.item.spec}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--gray-11)', textAlign: 'right' }}>
                    {r.item.quantity}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--gray-9)' }}>
                    {r.item.unit}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', color: '#e8eaf6', textAlign: 'right' }}>
                    {selected ? `¥${selected.unitPrice.toLocaleString()}` : '—'}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>
                    {r.status === 'exact' && selected && (
                      <Text size="1" style={{ color: '#16a34a' }}>{selected.name}</Text>
                    )}
                    {r.status === 'candidate' && (
                      <Select.Root
                        value={selected?.code ?? ''}
                        onValueChange={(code) => {
                          if (code === '__none__') {
                            handleSelectCandidate(r.item.code, null);
                            return;
                          }
                          const item = r.candidates.find(c => c.code === code) ?? null;
                          handleSelectCandidate(r.item.code, item);
                        }}
                      >
                        <Select.Trigger style={{ fontSize: '12px', background: 'rgba(217,119,6,0.1)', borderColor: 'rgba(217,119,6,0.3)' }} />
                        <Select.Content>
                          <Select.Item value="__none__">— 選択してください —</Select.Item>
                          {r.candidates.map(c => (
                            <Select.Item key={c.code} value={c.code}>
                              {c.name} {c.spec} (¥{c.unitPrice})
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select.Root>
                    )}
                    {r.status === 'unregistered' && (
                      <Flex align="center" gap="2">
                        <input
                          type="number"
                          placeholder="単価（円）"
                          onChange={(e) => handleManualPrice(r.item.code, Number(e.target.value))}
                          style={{
                            width: '100px', padding: '4px 8px', fontSize: '12px',
                            background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                            borderRadius: '6px', color: '#e8eaf6',
                          }}
                        />
                      </Flex>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Box>

      <Flex justify="between" align="center">
        <Text size="2" style={{ color: 'var(--gray-9)' }}>
          {confirmedCount} / {results.length} 件確定済み
        </Text>
        <Button
          size="3"
          onClick={handleConfirmAll}
          style={{ background: '#059669', color: 'white' }}
        >
          全て確定して次へ
        </Button>
      </Flex>
    </Box>
  );
}
