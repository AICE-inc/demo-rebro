'use client';

import { useState } from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { Check } from 'lucide-react';

interface Props {
  dimensions: string[];
  onSelect: (dimension: string) => void;
}

export function Step3Select({ dimensions, onSelect }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Flex direction="column" gap="6" align="center">
      <Box style={{ textAlign: 'center' }}>
        <Text size="6" weight="bold" style={{ color: '#e8eaf6', display: 'block' }}>
          基準寸法を選択
        </Text>
        <Text size="3" style={{ color: 'var(--gray-10)', marginTop: '0.5rem', display: 'block' }}>
          図面に記載されている寸法の中から、縮尺合わせの基準にする数値を選んでください
        </Text>
      </Box>

      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', width: '100%', maxWidth: '640px' }}>
        {dimensions.map((dim) => (
          <Box
            key={dim}
            onClick={() => setSelected(dim)}
            style={{
              padding: '1.25rem',
              border: `2px solid ${selected === dim ? '#00d4ff' : 'rgba(0,212,255,0.2)'}`,
              borderRadius: '12px',
              background: selected === dim ? 'rgba(0,212,255,0.12)' : 'rgba(0,212,255,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            {selected === dim && (
              <Box style={{ position: 'absolute', top: '8px', right: '8px' }}>
                <Check size={16} style={{ color: '#00d4ff' }} />
              </Box>
            )}
            <Text size="4" weight="bold" style={{ color: selected === dim ? '#00d4ff' : '#e8eaf6' }}>
              {dim}
            </Text>
          </Box>
        ))}
      </Box>

      {selected && (
        <Box style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '12px', padding: '1rem', maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <Text size="2" style={{ color: 'var(--gray-10)' }}>選択した基準寸法</Text>
          <Text size="6" weight="bold" style={{ color: '#00d4ff', display: 'block', marginTop: '0.25rem' }}>
            {selected}
          </Text>
        </Box>
      )}

      <Button
        size="3"
        disabled={!selected}
        onClick={() => selected && onSelect(selected)}
        style={{ background: selected ? '#00d4ff' : 'rgba(0,212,255,0.3)', color: '#0a0a0f', fontWeight: 'bold' }}
      >
        この寸法を基準にする →
      </Button>
    </Flex>
  );
}
