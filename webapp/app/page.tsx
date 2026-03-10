'use client';

import { useEffect, useRef } from 'react';
import { Box, Flex, Text, Button, Heading, Badge } from '@radix-ui/themes';
import Link from 'next/link';
import { HeroGrid } from '@/components/HeroGrid';

const DEMOS = [
  {
    href: '/scale',
    number: '01',
    title: '縮尺合わせ',
    problem: '図面の寸法を目視で読み取りRebroに手入力',
    solution: 'Gemini VisionがPDFから寸法を自動抽出し縮尺比率を計算',
    color: '#00d4ff',
  },
  {
    href: '/guide',
    number: '02',
    title: 'AI配管作図支援',
    problem: '配管径の選定に熟練が必要、Rebro操作手順を都度確認',
    solution: 'ClaudeがSHASE基準で配管径を計算しRebro操作手順を自動生成',
    color: '#7c3aed',
  },
  {
    href: '/estimate',
    number: '03',
    title: '見積書生成',
    problem: '拾い表から単価を1品目ずつカタログ検索・手入力（数時間）',
    solution: 'ClaudeがExcelを解析しAIマッチングで自動単価付け・見積書生成',
    color: '#059669',
  },
];

export default function HomePage() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!titleRef.current) return;
    import('animejs').then(({ animate }) => {
      animate(titleRef.current!, {
        opacity: [0, 1],
        translateY: [40, 0],
        duration: 1200,
        easing: 'easeOutExpo',
      });
    });
  }, []);

  return (
    <Box style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <HeroGrid />

      <Flex
        direction="column"
        align="center"
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          padding: '4rem 2rem',
          textAlign: 'center',
        }}
        gap="6"
      >
        <Badge color="cyan" variant="surface" size="2">
          AI × 建築設備
        </Badge>

        <Heading
          ref={titleRef}
          size="9"
          style={{
            opacity: 0,
            background: 'linear-gradient(135deg, #e8eaf6 0%, #00d4ff 60%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            maxWidth: '800px',
            lineHeight: '1.1',
          }}
        >
          Rebro AI デモ
        </Heading>

        <Text
          size="4"
          style={{ color: 'var(--gray-11)', maxWidth: '560px', lineHeight: '1.6' }}
        >
          配管設備工事の3つの課題をAIで自動化。
        </Text>

        <Flex gap="5" mt="6" wrap="wrap" justify="center" style={{ maxWidth: '1000px', width: '100%' }}>
          {DEMOS.map((demo) => (
            <Box
              key={demo.href}
              style={{
                flex: '1',
                minWidth: '280px',
                maxWidth: '320px',
                padding: '2rem',
                background: 'rgba(0,0,0,0.5)',
                border: `1px solid ${demo.color}33`,
                borderRadius: '16px',
                textAlign: 'left',
                transition: 'border-color 0.2s',
              }}
            >
              <Text size="1" style={{ color: demo.color, fontFamily: 'monospace', display: 'block', marginBottom: '0.5rem' }}>
                DEMO {demo.number}
              </Text>
              <Text size="5" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '1rem' }}>
                {demo.title}
              </Text>
              <Box style={{ marginBottom: '0.5rem' }}>
                <Text size="1" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.25rem' }}>課題</Text>
                <Text size="2" style={{ color: 'var(--gray-11)' }}>{demo.problem}</Text>
              </Box>
              <Box style={{ marginBottom: '1.5rem' }}>
                <Text size="1" style={{ color: demo.color, display: 'block', marginBottom: '0.25rem' }}>AIの解決</Text>
                <Text size="2" style={{ color: 'var(--gray-11)' }}>{demo.solution}</Text>
              </Box>
              <Button asChild size="3" variant="solid" style={{ background: demo.color, color: '#0a0a0f', width: '100%' }}>
                <Link href={demo.href}>デモを開始する</Link>
              </Button>
            </Box>
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}
