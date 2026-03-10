'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';

interface Props {
  imageBase64: string;
  onComplete: (dimensions: string[]) => void;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export function Step2Analyze({ imageBase64, onComplete }: Props) {
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
          rotateX: [15, 0],
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
      addLog('図面の構造を解析中...');

      let dimensions: string[] = [];
      try {
        const res = await fetch('/api/analyze-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64 }),
        });
        const data = await res.json();
        dimensions = data.dimensions ?? [];
        if (dimensions.length === 0) {
          throw new Error('No dimensions returned');
        }
      } catch {
        addLog('⚠ APIエラー。サンプルデータを使用します。');
        dimensions = ['5,300 mm', '2,400 mm', '1,820 mm', '910 mm', '3,640 mm'];
      }

      if (cancelled) return;

      addLog(`寸法数値を ${dimensions.length} 件検出しました`);
      for (const dim of dimensions) {
        await sleep(200);
        if (cancelled) return;
        addLog(`  ✓ ${dim} を検出`);
      }

      await sleep(500);
      if (cancelled) return;
      addLog('解析完了。候補を選択してください。');
      setDone(true);

      await sleep(800);
      if (!cancelled) onComplete(dimensions);
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
              border: '1px solid rgba(0,212,255,0.4)',
              boxShadow: '0 0 40px rgba(0,212,255,0.2), 0 20px 60px rgba(0,0,0,0.5)',
              transformStyle: 'preserve-3d',
            }}
          >
            <img
              src={`data:image/png;base64,${imageBase64}`}
              alt="解析中の図面"
              style={{ width: '100%', display: 'block', opacity: 0.85 }}
            />
            <div className="scan-beam" />
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
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
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: '12px',
            padding: '1rem',
            fontFamily: 'monospace',
          }}
        >
          <Text size="2" style={{ color: '#00d4ff', display: 'block', marginBottom: '0.5rem' }}>
            解析ログ
          </Text>
          {logs.map((log, i) => (
            <Text
              key={i}
              size="2"
              className="log-entry"
              style={{
                color: log.includes('✓') ? '#00d4ff' : log.includes('⚠') ? '#f59e0b' : 'var(--gray-10)',
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
