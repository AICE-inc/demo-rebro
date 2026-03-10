'use client';

import { useState } from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';

export interface StepData {
  id: number;
  title: string;
  description: string;
}

interface Props {
  steps: StepData[];
}

export function GuideStepCard({ steps }: Props) {
  const [currentStep, setCurrentStep] = useState(0);

  if (steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <Box style={{ padding: '1.5rem' }}>
      <Text size="2" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '1rem', fontFamily: 'monospace' }}>
        REBRO 操作ステップ
      </Text>

      {/* ステップインジケーター */}
      <Flex gap="2" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {steps.map((s, i) => (
          <Box
            key={s.id}
            onClick={() => setCurrentStep(i)}
            style={{
              width: '28px', height: '28px',
              borderRadius: '50%',
              background: i < currentStep ? '#00d4ff' : i === currentStep ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.1)',
              border: `1px solid ${i <= currentStep ? '#00d4ff' : 'rgba(255,255,255,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Text size="1" style={{ color: i < currentStep ? '#0a0a0f' : '#e8eaf6', fontWeight: 'bold' }}>
              {i < currentStep ? '✓' : s.id}
            </Text>
          </Box>
        ))}
      </Flex>

      {/* 現在のステップ */}
      <Box style={{
        padding: '1.5rem',
        background: 'rgba(0,212,255,0.05)',
        border: '1px solid rgba(0,212,255,0.3)',
        borderRadius: '12px',
        marginBottom: '1rem',
      }}>
        <Text size="1" style={{ color: '#00d4ff', display: 'block', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
          STEP {step.id} / {steps.length}
        </Text>
        <Text size="4" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '0.75rem' }}>
          {step.title}
        </Text>
        <Text size="2" style={{ color: 'var(--gray-11)', lineHeight: '1.6' }}>
          {step.description}
        </Text>
      </Box>

      <Flex gap="3">
        {currentStep > 0 && (
          <Button
            variant="outline"
            size="2"
            onClick={() => setCurrentStep(prev => prev - 1)}
            style={{ flex: 1, borderColor: 'rgba(255,255,255,0.2)', color: 'var(--gray-11)' }}
          >
            前のステップ
          </Button>
        )}
        {!isLast ? (
          <Button
            size="2"
            onClick={() => setCurrentStep(prev => prev + 1)}
            style={{ flex: 1, background: '#00d4ff', color: '#0a0a0f' }}
          >
            完了・次へ
          </Button>
        ) : (
          <Button
            size="2"
            onClick={() => setCurrentStep(0)}
            style={{ flex: 1, background: 'rgba(0,212,255,0.2)', color: '#00d4ff' }}
          >
            最初から確認
          </Button>
        )}
      </Flex>
    </Box>
  );
}
