'use client';

import { useState, useCallback } from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import Link from 'next/link';
import { HeroGrid } from '@/components/HeroGrid';
import { GuideStep1Upload } from '@/components/GuideStep1Upload';
import { GuideStep2Analyze } from '@/components/GuideStep2Analyze';
import type { DrawingInfo } from '@/lib/gemini';
import { GuideChat } from '@/components/GuideChat';

type Step = 'upload' | 'analyze' | 'chat';

export default function GuidePage() {
  const [step, setStep] = useState<Step>('upload');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [drawingInfo, setDrawingInfo] = useState<DrawingInfo | null>(null);

  const handleUploadNext = useCallback((base64: string, _fileName: string) => {
    setImageBase64(base64);
    setStep('analyze');
  }, []);

  const handleAnalyzeComplete = useCallback((info: DrawingInfo) => {
    setDrawingInfo(info);
    setStep('chat');
  }, []);

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

      {/* ステップインジケーター */}
      {step !== 'chat' && (
        <Flex justify="center" gap="2" style={{ position: 'relative', zIndex: 1, padding: '1rem 2rem', flexShrink: 0 }}>
          {(['upload', 'analyze', 'chat'] as const).map((s, i) => {
            const labels = ['アップロード', 'AI解析', 'チャット'];
            const stepOrder = ['upload', 'analyze', 'chat'];
            const currentIdx = stepOrder.indexOf(step);
            const isActive = step === s;
            const isDone = currentIdx > i;
            return (
              <Flex key={s} align="center" gap="2">
                <Flex direction="column" align="center" gap="1">
                  <Box style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: isDone ? '#7c3aed' : isActive ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.1)',
                    border: `2px solid ${isDone || isActive ? '#7c3aed' : 'rgba(124,58,237,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isActive ? '0 0 16px #7c3aed60' : 'none',
                    transition: 'all 0.3s ease',
                  }}>
                    <Text size="2" weight="bold" style={{ color: isDone ? '#fff' : isActive ? '#c4b5fd' : 'var(--gray-9)' }}>
                      {i + 1}
                    </Text>
                  </Box>
                  <Text size="1" style={{ color: isDone || isActive ? '#c4b5fd' : 'var(--gray-9)', whiteSpace: 'nowrap' }}>
                    {labels[i]}
                  </Text>
                </Flex>
                {i < 2 && (
                  <Box style={{ width: '40px', height: '2px', background: isDone ? '#7c3aed' : 'rgba(124,58,237,0.15)', marginBottom: '18px', transition: 'all 0.3s ease' }} />
                )}
              </Flex>
            );
          })}
        </Flex>
      )}

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
          <Box style={{ height: '100%', display: 'flex' }}>
            <GuideChat drawingInfo={drawingInfo} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
