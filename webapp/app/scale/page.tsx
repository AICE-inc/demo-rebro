'use client';

import { useState } from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import Link from 'next/link';
import { HeroGrid } from '@/components/HeroGrid';
import { Step1Upload } from '@/components/Step1Upload';
import { Step2Analyze } from '@/components/Step2Analyze';
import { Step3Select } from '@/components/Step3Select';
import { Step4Result } from '@/components/Step4Result';

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1, label: 'アップロード' },
  { num: 2, label: 'AI解析' },
  { num: 3, label: '寸法選択' },
  { num: 4, label: '結果' },
];

export default function ScalePage() {
  const [step, setStep] = useState<Step>(1);
  const [imageBase64, setImageBase64] = useState('');
  const [dimensions, setDimensions] = useState<string[]>([]);
  const [selectedDim, setSelectedDim] = useState('');

  const handleUploadNext = (base64: string) => {
    setImageBase64(base64);
    setStep(2);
  };

  const handleAnalyzeComplete = (dims: string[]) => {
    setDimensions(dims);
    setStep(3);
  };

  const handleSelect = (dim: string) => {
    setSelectedDim(dim);
    setStep(4);
  };

  const handleRestart = () => {
    setStep(1);
    setImageBase64('');
    setDimensions([]);
    setSelectedDim('');
  };

  return (
    <Box style={{ position: 'relative', minHeight: '100vh' }}>
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
          <Text size="1" style={{ color: '#00d4ff', fontFamily: 'monospace' }}>DEMO 01</Text>
          <Text size="3" weight="bold" style={{ color: '#e8eaf6' }}>縮尺合わせ</Text>
        </Flex>
        <Button asChild variant="ghost" size="2" style={{ color: 'var(--gray-9)' }}>
          <Link href="/">トップへ戻る</Link>
        </Button>
      </Flex>

      <Box style={{ position: 'relative', zIndex: 1, padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
        {/* ステップインジケーター */}
        <Flex justify="center" gap="2" style={{ marginBottom: '3rem', paddingTop: '1rem' }}>
          {STEPS.map((s, i) => (
            <Flex key={s.num} align="center" gap="2">
              <Flex direction="column" align="center" gap="1">
                <Box style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: step >= s.num ? '#00d4ff' : 'rgba(0,212,255,0.15)',
                  border: step === s.num ? '2px solid #00d4ff' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease',
                  boxShadow: step === s.num ? '0 0 16px #00d4ff60' : 'none',
                }}>
                  <Text size="2" weight="bold" style={{ color: step >= s.num ? '#0a0a0f' : 'var(--gray-9)' }}>
                    {s.num}
                  </Text>
                </Box>
                <Text size="1" style={{ color: step >= s.num ? '#00d4ff' : 'var(--gray-9)', whiteSpace: 'nowrap' }}>
                  {s.label}
                </Text>
              </Flex>
              {i < STEPS.length - 1 && (
                <Box style={{
                  width: '40px',
                  height: '2px',
                  background: step > s.num ? '#00d4ff' : 'rgba(0,212,255,0.15)',
                  marginBottom: '18px',
                  transition: 'all 0.3s ease',
                }} />
              )}
            </Flex>
          ))}
        </Flex>

        {/* ステップコンテンツ */}
        <Box style={{
          background: 'rgba(10,10,15,0.8)',
          border: '1px solid rgba(0,212,255,0.15)',
          borderRadius: '20px',
          padding: '2.5rem',
          backdropFilter: 'blur(20px)',
          minHeight: '400px',
        }}>
          {step === 1 && <Step1Upload onNext={handleUploadNext} />}
          {step === 2 && <Step2Analyze imageBase64={imageBase64} onComplete={handleAnalyzeComplete} />}
          {step === 3 && <Step3Select dimensions={dimensions} onSelect={handleSelect} />}
          {step === 4 && <Step4Result baseDimension={selectedDim} onRestart={handleRestart} />}
        </Box>
      </Box>
    </Box>
  );
}
