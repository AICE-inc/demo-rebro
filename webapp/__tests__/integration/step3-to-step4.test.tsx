import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Step3Select } from '@/components/Step3Select';
import { Step4Result } from '@/components/Step4Result';

// animejs をモック
vi.mock('animejs', () => ({
  default: vi.fn(),
}));

describe('Step3Select → Step4Result 連携', () => {
  it('Step3Select で寸法を選択して onSelect が呼ばれる', async () => {
    const onSelect = vi.fn();
    const dimensions = ['5,300 mm', '2,400 mm', '1,820 mm'];

    render(<Step3Select dimensions={dimensions} onSelect={onSelect} />);

    // 寸法をクリックして選択
    fireEvent.click(screen.getByText('5,300 mm'));

    // 確定ボタンをクリック
    const confirmButton = screen.getByText('この寸法を基準にする →');
    fireEvent.click(confirmButton);

    expect(onSelect).toHaveBeenCalledWith('5,300 mm');
  });

  it('Step4Result に baseDimension が渡されて表示される', () => {
    const onRestart = vi.fn();
    render(<Step4Result baseDimension="5,300 mm" onRestart={onRestart} />);

    expect(screen.getByText('5,300 mm')).toBeInTheDocument();
    expect(screen.getByText('縮尺比率を計算')).toBeInTheDocument();
  });
});
