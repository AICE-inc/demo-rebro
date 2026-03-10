import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Step4Result } from '@/components/Step4Result';

// animejs をモック（動的 import で { animate } を取り出すため named export も定義する）
vi.mock('animejs', () => ({
  default: vi.fn(),
  animate: vi.fn(),
}));

describe('Step4Result', () => {
  it('baseDimension が "5300mm" のとき表示される', () => {
    const onRestart = vi.fn();
    render(<Step4Result baseDimension="5300mm" onRestart={onRestart} />);

    expect(screen.getByText('5300mm')).toBeInTheDocument();
  });

  it('measured に "8831" を入力すると ratio が計算される（base/meas = 5300/8831）', async () => {
    const onRestart = vi.fn();
    render(<Step4Result baseDimension="5300mm" onRestart={onRestart} />);

    const input = screen.getByPlaceholderText('例：8831');
    fireEvent.change(input, { target: { value: '8831' } });

    // ratio = 5300 / 8831 ≈ 0.6003
    const expectedRatio = (5300 / 8831).toFixed(4);
    // ratioRef に書き込まれる前に anime が呼ばれるが、モック済みなので textContent は変わらない
    // ratio が非null になったことを確認（手順テキストが表示される）
    expect(screen.getByText('Rebroの「縮尺合わせ」にこの値を入力してください')).toBeInTheDocument();
    // ratio.toFixed(4) が手順文字列に含まれることを確認
    expect(screen.getByText(`補正比率に「${expectedRatio}」を入力`)).toBeInTheDocument();
  });

  it('onRestart ボタンクリックで callback が呼ばれる', () => {
    const onRestart = vi.fn();
    render(<Step4Result baseDimension="5300mm" onRestart={onRestart} />);

    const button = screen.getByText('もう一度試す');
    fireEvent.click(button);

    expect(onRestart).toHaveBeenCalledOnce();
  });
});
