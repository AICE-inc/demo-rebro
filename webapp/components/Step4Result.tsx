'use client';

import { useState, useEffect, useRef } from 'react';
import { Box, Flex, Text, Button, TextField } from '@radix-ui/themes';
import { RotateCcw } from 'lucide-react';

interface Props {
  baseDimension: string;
  onRestart: () => void;
  onComplete?: () => void;
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
}

export function Step4Result({ baseDimension, onRestart, onComplete }: Props) {
  const [measured, setMeasured] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const ratioRef = useRef<HTMLSpanElement>(null);

  const base = parseNum(baseDimension);
  const meas = parseNum(measured);
  const ratio = meas > 0 ? base / meas : null;

  useEffect(() => {
    if (ratio === null || !ratioRef.current) return;
    import('animejs').then(({ animate }) => {
      const obj = { value: 0 };
      animate(obj, {
        value: ratio,
        duration: 800,
        easing: 'easeOutExpo',
        onUpdate: () => {
          if (ratioRef.current) {
            ratioRef.current.textContent = obj.value.toFixed(4);
          }
        },
      });
    });
  }, [ratio]);

  return (
    <Flex direction="column" gap="6" align="center">
      <Box style={{ textAlign: 'center' }}>
        <Text size="6" weight="bold" style={{ color: '#e8eaf6', display: 'block' }}>
          縮尺比率を計算
        </Text>
        <Text size="3" style={{ color: 'var(--gray-10)', marginTop: '0.5rem', display: 'block' }}>
          Rebroで実際に計測した値を入力してください
        </Text>
      </Box>

      <Box style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: '16px', padding: '2rem', maxWidth: '480px', width: '100%' }}>
        <Flex direction="column" gap="4">
          <Flex justify="between" align="center">
            <Text size="3" style={{ color: 'var(--gray-10)' }}>基準寸法（図面記載値）</Text>
            <Text size="4" weight="bold" style={{ color: '#00d4ff' }}>{baseDimension}</Text>
          </Flex>

          <Box>
            <Text size="3" style={{ color: 'var(--gray-10)', display: 'block', marginBottom: '0.5rem' }}>
              Rebroで計測した値 (mm)
            </Text>
            <TextField.Root
              size="3"
              placeholder="例：8831"
              value={measured}
              onChange={(e) => setMeasured(e.target.value)}
              style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.3)' }}
            />
          </Box>

          <Box style={{
            textAlign: 'center',
            padding: '1.5rem',
            background: ratio ? 'rgba(0,212,255,0.08)' : 'rgba(0,0,0,0.2)',
            borderRadius: '12px',
            border: ratio ? '1px solid rgba(0,212,255,0.4)' : '1px solid transparent',
            transition: 'all 0.3s ease',
          }}>
            <Text size="2" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.5rem' }}>
              縮尺補正比率
            </Text>
            <Text
              size="8"
              weight="bold"
              style={{ color: ratio ? '#00d4ff' : 'var(--gray-8)', fontFamily: 'monospace' }}
            >
              <span ref={ratioRef}>{ratio ? '0.0000' : '----'}</span>
            </Text>
            {ratio && (
              <Text size="2" style={{ color: 'var(--gray-10)', display: 'block', marginTop: '0.5rem' }}>
                Rebroの「縮尺合わせ」にこの値を入力してください
              </Text>
            )}
          </Box>
        </Flex>
      </Box>

      {ratio && (
        <Box style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: '16px', padding: '1.5rem', maxWidth: '480px', width: '100%' }}>
          <Text size="3" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '1rem' }}>
            Rebroへの入力手順
          </Text>
          {[
            '図面全体を選択（Ctrl+A）',
            'メニュー → 加工 → 縮尺合わせ を選択',
            `補正比率に「${ratio.toFixed(4)}」を入力`,
            'OKをクリックして完了',
          ].map((step, i) => (
            <Flex key={i} gap="3" align="start" style={{ marginBottom: '0.75rem' }}>
              <Box style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,212,255,0.2)', border: '1px solid rgba(0,212,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Text size="1" style={{ color: '#00d4ff' }}>{i + 1}</Text>
              </Box>
              <Text size="2" style={{ color: 'var(--gray-10)' }}>{step}</Text>
            </Flex>
          ))}
        </Box>
      )}

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

      <Button
        size="3"
        variant="ghost"
        onClick={onRestart}
        style={{ color: 'var(--gray-10)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <RotateCcw size={16} />
        もう一度試す
      </Button>
    </Flex>
  );
}
