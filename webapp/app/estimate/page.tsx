'use client';

import { Box, Flex, Text, Button } from '@radix-ui/themes';
import Link from 'next/link';
import { HeroGrid } from '@/components/HeroGrid';
import { EstimateWizard } from '@/components/EstimateWizard';

export default function EstimatePage() {
  return (
    <Box style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
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
        }}
      >
        <Flex align="center" gap="3">
          <Text size="1" style={{ color: '#059669', fontFamily: 'monospace' }}>DEMO 03</Text>
          <Text size="3" weight="bold" style={{ color: '#e8eaf6' }}>見積書生成</Text>
        </Flex>
        <Button asChild variant="ghost" size="2" style={{ color: 'var(--gray-9)' }}>
          <Link href="/">トップへ戻る</Link>
        </Button>
      </Flex>

      {/* メインコンテンツ */}
      <Box style={{ position: 'relative', zIndex: 1 }}>
        <EstimateWizard />
      </Box>
    </Box>
  );
}
