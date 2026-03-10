'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import type { DrawingInfo } from '@/lib/gemini';

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

      let info: DrawingInfo = { drawingType: '', pipeSystems: [], fixtures: [], scaleDimension: '', siteRules: [], uncertainItems: [], rawText: '' };
      try {
        const res = await fetch('/api/analyze-guide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        info = {
          drawingType: data.drawingType ?? '',
          pipeSystems: data.pipeSystems ?? [],
          fixtures: data.fixtures ?? [],
          scaleDimension: data.scaleDimension ?? '',
          siteRules: data.siteRules ?? [],
          uncertainItems: data.uncertainItems ?? [],
          rawText: data.rawText ?? '',
        };
        if (info.pipeSystems.length === 0 && info.fixtures.length === 0) {
          throw new Error('No drawing info returned');
        }
      } catch {
        addLog('⚠ APIエラー。サンプルデータを使用します。');
        info = {
          drawingType: '平面図(給水給湯)',
          pipeSystems: [
            { type: '給水', mainDiameter: '16φ', branchDiameter: '13φ', material: 'ポリブデン管', routing: '床配管(SL±0)' },
            { type: '給湯', mainDiameter: '16φ', branchDiameter: '13φ', material: 'ポリブデン管', routing: '床配管(SL±0)' },
            { type: '排水', mainDiameter: '65φ', branchDiameter: '', material: '塩ビ管', routing: '床配管(SL-200)' },
          ],
          fixtures: [
            { name: '洗面台', count: 1, slLevel: 'SL+1000', drainDiameter: '40φ' },
            { name: 'トイレ', count: 1, slLevel: 'SL+1000', drainDiameter: '75φ' },
            { name: 'キッチン', count: 1, slLevel: 'SL+1000', drainDiameter: '40φ' },
          ],
          scaleDimension: '5,300mm',
          siteRules: [],
          uncertainItems: [],
          rawText: '',
        };
      }

      if (cancelled) return;

      if (info.drawingType) {
        addLog(`図面種別: ${info.drawingType}`);
      }
      if (info.pipeSystems.length > 0) {
        addLog(`配管系統を検出: ${info.pipeSystems.map(p => p.type).join('・')}`);
      }
      for (const fixture of info.fixtures) {
        await sleep(150);
        if (cancelled) return;
        addLog(`  ✓ ${fixture.name}×${fixture.count}${fixture.drainDiameter ? ` (排水${fixture.drainDiameter})` : ''}`);
      }
      if (info.uncertainItems.length > 0) {
        addLog(`要確認事項: ${info.uncertainItems.length}件`);
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
