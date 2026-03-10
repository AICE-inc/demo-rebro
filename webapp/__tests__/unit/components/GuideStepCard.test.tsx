import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { GuideStepCard, StepData } from '../../../components/GuideStepCard';

// Radix UI をモック
vi.mock('@radix-ui/themes', () => ({
  Box: ({ children, onClick, style }: { children?: React.ReactNode; onClick?: () => void; style?: React.CSSProperties }) =>
    <div onClick={onClick} style={style}>{children}</div>,
  Flex: ({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }) =>
    <div style={style}>{children}</div>,
  Text: ({ children, size, weight, style }: { children?: React.ReactNode; size?: string; weight?: string; style?: React.CSSProperties }) =>
    <span style={style}>{children}</span>,
  Button: ({ children, onClick, disabled, variant, size, style }: { children?: React.ReactNode; onClick?: () => void; disabled?: boolean; variant?: string; size?: string; style?: React.CSSProperties }) =>
    <button onClick={onClick} disabled={disabled} style={style}>{children}</button>,
}));

const SAMPLE_STEPS: StepData[] = [
  { id: 1, title: '配管メニューを開く', description: 'Rebroのメニューから配管を選択' },
  { id: 2, title: '管径を設定する', description: '20Aを選択してください' },
  { id: 3, title: '配管を引く', description: 'メーターボックスから分岐点まで' },
];

describe('GuideStepCard', () => {
  it('ステップが表示される', () => {
    render(<GuideStepCard steps={SAMPLE_STEPS} />);
    expect(screen.getByText('配管メニューを開く')).toBeTruthy();
    expect(screen.getByText('Rebroのメニューから配管を選択')).toBeTruthy();
  });

  it('ステップ数が表示される', () => {
    render(<GuideStepCard steps={SAMPLE_STEPS} />);
    expect(screen.getByText('STEP 1 / 3')).toBeTruthy();
  });

  it('「完了・次へ」ボタンで次のステップに進む', () => {
    render(<GuideStepCard steps={SAMPLE_STEPS} />);
    const nextButton = screen.getByText('完了・次へ');
    fireEvent.click(nextButton);
    expect(screen.getByText('STEP 2 / 3')).toBeTruthy();
    expect(screen.getByText('管径を設定する')).toBeTruthy();
  });

  it('最後のステップでは「最初から確認」ボタンが表示される', () => {
    render(<GuideStepCard steps={[SAMPLE_STEPS[0]]} />);
    expect(screen.getByText('最初から確認')).toBeTruthy();
  });

  it('ステップが空の場合は何も表示しない', () => {
    const { container } = render(<GuideStepCard steps={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
