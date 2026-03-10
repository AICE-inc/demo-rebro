'use client';

import { useState, useRef } from 'react';
import { Box, Flex, Text, Button, TextField, Badge } from '@radix-ui/themes';
import { parseExcelFile, ParsedItem } from '@/lib/excel-parser';
import { MatchResult, CatalogItem } from '@/lib/matching-engine';
import { MatchingTable, ConfirmedMatch } from './MatchingTable';

type Step = 1 | 2 | 3 | 4 | 5;

interface ProjectInfo {
  projectName: string;
  workDate: string;
  developerName: string;
}

interface EstimateParams {
  markupRate: number;
  processingCost: number;
  expenseRate: number;
  discountRate: number;
}

const STEP_LABELS = ['プロジェクト登録', 'Excel アップロード', 'AIマッチング確認', 'パラメータ設定', 'プレビュー・出力'];

export function EstimateWizard() {
  const [step, setStep] = useState<Step>(1);
  const [project, setProject] = useState<ProjectInfo>({ projectName: '', workDate: '', developerName: '' });
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [confirmedMatches, setConfirmedMatches] = useState<ConfirmedMatch[]>([]);
  const [params, setParams] = useState<EstimateParams>({ markupRate: 1.15, processingCost: 50000, expenseRate: 0.1, discountRate: 0.05 });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsLoading(true);
    const allItems: ParsedItem[] = [];
    const fileNames: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const buffer = await file.arrayBuffer();
        const items = await parseExcelFile(buffer, file.name);
        allItems.push(...items);
        fileNames.push(file.name);
      } catch (err) {
        console.error(`Failed to parse ${file.name}:`, err);
      }
    }

    setParsedItems(allItems);
    setUploadedFiles(fileNames);
    setIsLoading(false);
  };

  const SAMPLE_FILES = [
    { label: 'A現場 水湯焚', path: '/sample/A現場_水湯焚.xlsx', name: 'A現場_水湯焚.xlsx' },
    { label: 'A現場 排水', path: '/sample/A現場_排水.xlsx', name: 'A現場_排水.xlsx' },
    { label: 'B現場 給水給湯', path: '/sample/B現場_給水給湯.xlsx', name: 'B現場_給水給湯.xlsx' },
    { label: 'B現場 排水', path: '/sample/B現場_排水.xlsx', name: 'B現場_排水.xlsx' },
  ];

  const [selectedSamples, setSelectedSamples] = useState<string[]>([]);

  const handleLoadSamples = async () => {
    const targets = SAMPLE_FILES.filter(f => selectedSamples.includes(f.path));
    if (targets.length === 0) return;
    setIsLoading(true);
    const allItems: ParsedItem[] = [];
    const fileNames: string[] = [];
    for (const sf of targets) {
      try {
        const res = await fetch(sf.path);
        const buffer = await res.arrayBuffer();
        const items = await parseExcelFile(buffer, sf.name);
        allItems.push(...items);
        fileNames.push(sf.name);
      } catch (err) {
        console.error(`Failed to load ${sf.name}:`, err);
      }
    }
    setParsedItems(allItems);
    setUploadedFiles(fileNames);
    setIsLoading(false);
  };

  const handleRunMatching = async () => {
    if (parsedItems.length === 0) return;
    setIsLoading(true);
    try {
      const catalogRes = await fetch('/sample/catalog.json');
      const catalog = await catalogRes.json();

      const res = await fetch('/api/estimate-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedItems, catalog: catalog.items }),
      });
      const data = await res.json();
      setMatchResults(data.results);
      setStep(3);
    } catch (err) {
      console.error('Matching error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const exportParams = {
        ...project,
        markupRate: params.markupRate,
        processingCost: params.processingCost,
        expenseRate: params.expenseRate,
        discountRate: params.discountRate,
      };

      // confirmedMatchesを使ってmatchResultsを更新
      const updatedResults = matchResults.map(r => {
        const confirmed = confirmedMatches.find(c => c.itemCode === r.item.code);
        if (confirmed) {
          return {
            ...r,
            matchedCatalog: confirmed.catalogItem ?? r.matchedCatalog,
            status: (confirmed.catalogItem ? 'exact' : r.status) as 'exact' | 'candidate' | 'unregistered',
          };
        }
        return r;
      });

      const res = await fetch('/api/estimate-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: updatedResults, params: exportParams }),
      });

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `見積書_${project.projectName}_${project.workDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const subtotal = matchResults.reduce((sum, r) => {
    const unitPrice = r.matchedCatalog?.unitPrice ?? 0;
    return sum + Math.round(unitPrice * params.markupRate * r.item.quantity);
  }, 0);
  const withExpense = Math.round(subtotal * (1 + params.expenseRate));
  const total = Math.round((withExpense + params.processingCost) * (1 - params.discountRate));

  return (
    <Box style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      {/* ステップインジケーター */}
      <Flex gap="2" justify="center" style={{ marginBottom: '2.5rem' }}>
        {STEP_LABELS.map((label, i) => {
          const stepNum = (i + 1) as Step;
          const isActive = step === stepNum;
          const isDone = step > stepNum;
          return (
            <Flex key={stepNum} align="center" gap="2">
              <Flex direction="column" align="center" gap="1">
                <Box style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: isDone ? '#059669' : isActive ? 'rgba(5,150,105,0.3)' : 'rgba(255,255,255,0.1)',
                  border: `2px solid ${isDone || isActive ? '#059669' : 'rgba(255,255,255,0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  boxShadow: isActive ? '0 0 16px #05966960' : 'none',
                  transition: 'all 0.3s ease',
                }}>
                  <Text size="1" weight="bold" style={{ color: isDone ? '#fff' : isActive ? '#10b981' : 'var(--gray-9)' }}>
                    {isDone ? '✓' : stepNum}
                  </Text>
                </Box>
                <Text size="1" style={{ color: isActive ? '#10b981' : 'var(--gray-9)', whiteSpace: 'nowrap' }}>{label}</Text>
              </Flex>
              {i < STEP_LABELS.length - 1 && (
                <Box style={{ width: '24px', height: '2px', background: isDone ? '#059669' : 'rgba(255,255,255,0.1)', marginBottom: '18px', transition: 'all 0.3s ease' }} />
              )}
            </Flex>
          );
        })}
      </Flex>

      {/* Step 1: プロジェクト登録 */}
      {step === 1 && (
        <Box style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Text size="5" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '1.5rem' }}>プロジェクト情報</Text>
          <Flex direction="column" gap="4" style={{ maxWidth: '480px' }}>
            <Box>
              <Text size="2" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.5rem' }}>現場名</Text>
              <TextField.Root
                value={project.projectName}
                onChange={e => setProject(p => ({ ...p, projectName: e.target.value }))}
                placeholder="例：○○マンション 給排水設備工事"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#e8eaf6' }}
              />
            </Box>
            <Box>
              <Text size="2" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.5rem' }}>工事日付</Text>
              <TextField.Root
                type="date"
                value={project.workDate}
                onChange={e => setProject(p => ({ ...p, workDate: e.target.value }))}
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#e8eaf6' }}
              />
            </Box>
            <Box>
              <Text size="2" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.5rem' }}>提出先（デベロッパー名）</Text>
              <TextField.Root
                value={project.developerName}
                onChange={e => setProject(p => ({ ...p, developerName: e.target.value }))}
                placeholder="例：佐藤建設株式会社"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#e8eaf6' }}
              />
            </Box>
          </Flex>
          <Button
            mt="5" size="3"
            disabled={!project.projectName}
            onClick={() => setStep(2)}
            style={{ background: '#059669', color: 'white' }}
          >
            次へ：Excelアップロード
          </Button>
        </Box>
      )}

      {/* Step 2: Excelアップロード */}
      {step === 2 && (
        <Box style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Text size="5" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '1.5rem' }}>拾い表 Excel アップロード</Text>

          <Box
            style={{
              border: '2px dashed rgba(5,150,105,0.4)',
              borderRadius: '12px',
              padding: '3rem',
              textAlign: 'center',
              marginBottom: '1.5rem',
              cursor: 'pointer',
              background: 'rgba(5,150,105,0.05)',
            }}
            onClick={() => fileRef.current?.click()}
          >
            <Text size="3" style={{ color: 'var(--gray-10)', display: 'block', marginBottom: '0.5rem' }}>
              クリックしてファイルを選択
            </Text>
            <Text size="2" style={{ color: 'var(--gray-9)' }}>
              .xlsx ファイル（複数選択可）
            </Text>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </Box>

          {/* サンプルファイル選択 */}
          <Box style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)', borderRadius: '10px' }}>
            <Text size="2" weight="bold" style={{ color: '#10b981', display: 'block', marginBottom: '0.75rem' }}>
              サンプルデータを使用
            </Text>
            <Flex gap="2" wrap="wrap" style={{ marginBottom: '0.75rem' }}>
              {SAMPLE_FILES.map(sf => {
                const checked = selectedSamples.includes(sf.path);
                return (
                  <Box
                    key={sf.path}
                    onClick={() => setSelectedSamples(prev =>
                      checked ? prev.filter(p => p !== sf.path) : [...prev, sf.path]
                    )}
                    style={{
                      padding: '0.4rem 0.9rem',
                      borderRadius: '20px',
                      border: `1px solid ${checked ? '#059669' : 'rgba(255,255,255,0.15)'}`,
                      background: checked ? 'rgba(5,150,105,0.25)' : 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Text size="2" style={{ color: checked ? '#10b981' : 'var(--gray-10)' }}>{sf.label}</Text>
                  </Box>
                );
              })}
            </Flex>
            <Button
              size="2"
              disabled={selectedSamples.length === 0 || isLoading}
              onClick={handleLoadSamples}
              style={{ background: '#059669', color: 'white' }}
            >
              {isLoading ? '読み込み中...' : `選択したサンプルを読み込む（${selectedSamples.length}件）`}
            </Button>
          </Box>

          {uploadedFiles.length > 0 && (
            <Box style={{ marginBottom: '1.5rem' }}>
              {uploadedFiles.map(f => (
                <Flex key={f} align="center" gap="2" style={{ marginBottom: '0.5rem' }}>
                  <Badge color="green" variant="soft">{f}</Badge>
                </Flex>
              ))}
              <Text size="2" style={{ color: 'var(--gray-9)' }}>
                合計 {parsedItems.length} 品目を検出
              </Text>
            </Box>
          )}

          <Flex gap="3" wrap="wrap">
            <Button variant="outline" size="2" onClick={() => setStep(1)} style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'var(--gray-11)' }}>
              戻る
            </Button>
            <Button
              size="3"
              disabled={parsedItems.length === 0 || isLoading}
              onClick={handleRunMatching}
              style={{ background: '#059669', color: 'white' }}
            >
              {isLoading ? 'AIマッチング中...' : 'AIマッチングを実行'}
            </Button>
          </Flex>
        </Box>
      )}

      {/* Step 3: AIマッチング確認 */}
      {step === 3 && (
        <Box style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Text size="5" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '1.5rem' }}>
            AIマッチング結果確認
          </Text>
          <MatchingTable
            results={matchResults}
            onConfirm={(confirmed) => {
              setConfirmedMatches(confirmed);
              setStep(4);
            }}
          />
        </Box>
      )}

      {/* Step 4: パラメータ設定 */}
      {step === 4 && (
        <Box style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Text size="5" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '1.5rem' }}>見積もりパラメータ</Text>
          <Flex direction="column" gap="4" style={{ maxWidth: '400px', marginBottom: '2rem' }}>
            {[
              { label: '掛率（例：1.15 = 15%上乗せ）', key: 'markupRate', placeholder: '1.15' },
              { label: '加工費（円）', key: 'processingCost', placeholder: '50000' },
              { label: '経費率（例：0.1 = 10%）', key: 'expenseRate', placeholder: '0.1' },
              { label: '値引き率（例：0.05 = 5%引き）', key: 'discountRate', placeholder: '0.05' },
            ].map(({ label, key, placeholder }) => (
              <Box key={key}>
                <Text size="2" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.5rem' }}>{label}</Text>
                <TextField.Root
                  type="number"
                  step="0.01"
                  value={String(params[key as keyof EstimateParams])}
                  onChange={e => setParams(p => ({ ...p, [key]: parseFloat(e.target.value) || 0 }))}
                  placeholder={placeholder}
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#e8eaf6' }}
                />
              </Box>
            ))}
          </Flex>

          {/* プレビュー */}
          <Box style={{ padding: '1.5rem', background: 'rgba(5,150,105,0.1)', border: '1px solid rgba(5,150,105,0.3)', borderRadius: '12px', marginBottom: '1.5rem', maxWidth: '400px' }}>
            <Text size="3" weight="bold" style={{ color: '#10b981', display: 'block', marginBottom: '0.75rem' }}>試算</Text>
            <Flex direction="column" gap="2">
              <Flex justify="between"><Text size="2" style={{ color: 'var(--gray-9)' }}>材料費小計</Text><Text size="2" style={{ color: '#e8eaf6' }}>¥{subtotal.toLocaleString()}</Text></Flex>
              <Flex justify="between"><Text size="2" style={{ color: 'var(--gray-9)' }}>経費込み</Text><Text size="2" style={{ color: '#e8eaf6' }}>¥{withExpense.toLocaleString()}</Text></Flex>
              <Flex justify="between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                <Text size="3" weight="bold" style={{ color: '#10b981' }}>合計（税抜）</Text>
                <Text size="3" weight="bold" style={{ color: '#10b981' }}>¥{total.toLocaleString()}</Text>
              </Flex>
            </Flex>
          </Box>

          <Flex gap="3">
            <Button variant="outline" size="2" onClick={() => setStep(3)} style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'var(--gray-11)' }}>
              戻る
            </Button>
            <Button size="3" onClick={() => setStep(5)} style={{ background: '#059669', color: 'white' }}>
              次へ：プレビュー確認
            </Button>
          </Flex>
        </Box>
      )}

      {/* Step 5: プレビュー・出力 */}
      {step === 5 && (
        <Box style={{ padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <Text size="5" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '1.5rem' }}>見積書プレビュー</Text>

          <Box style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.4)', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Text size="4" weight="bold" style={{ color: '#e8eaf6', display: 'block', marginBottom: '0.5rem' }}>見積書</Text>
            <Text size="2" style={{ color: 'var(--gray-9)', display: 'block' }}>工事件名：{project.projectName}</Text>
            <Text size="2" style={{ color: 'var(--gray-9)', display: 'block' }}>工事日付：{project.workDate}</Text>
            <Text size="2" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '1rem' }}>提出先：{project.developerName}</Text>

            <Flex direction="column" gap="1" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <Flex justify="between"><Text size="2" style={{ color: 'var(--gray-9)' }}>品目数</Text><Text size="2" style={{ color: '#e8eaf6' }}>{matchResults.length} 品目</Text></Flex>
              <Flex justify="between"><Text size="2" style={{ color: 'var(--gray-9)' }}>材料費小計</Text><Text size="2" style={{ color: '#e8eaf6' }}>¥{subtotal.toLocaleString()}</Text></Flex>
              <Flex justify="between"><Text size="2" style={{ color: 'var(--gray-9)' }}>加工費</Text><Text size="2" style={{ color: '#e8eaf6' }}>¥{params.processingCost.toLocaleString()}</Text></Flex>
              <Flex justify="between"><Text size="2" style={{ color: 'var(--gray-9)' }}>経費（{Math.round(params.expenseRate * 100)}%）</Text><Text size="2" style={{ color: '#e8eaf6' }}>¥{(subtotal * params.expenseRate).toLocaleString()}</Text></Flex>
              <Flex justify="between"><Text size="2" style={{ color: 'var(--gray-9)' }}>値引き（{Math.round(params.discountRate * 100)}%）</Text><Text size="2" style={{ color: '#dc2626' }}>-¥{Math.round((withExpense + params.processingCost) * params.discountRate).toLocaleString()}</Text></Flex>
              <Flex justify="between" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                <Text size="4" weight="bold" style={{ color: '#10b981' }}>合計（税抜）</Text>
                <Text size="4" weight="bold" style={{ color: '#10b981' }}>¥{total.toLocaleString()}</Text>
              </Flex>
            </Flex>
          </Box>

          <Flex gap="3">
            <Button variant="outline" size="2" onClick={() => setStep(4)} style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'var(--gray-11)' }}>
              戻る
            </Button>
            <Button
              size="3"
              disabled={isLoading}
              onClick={handleExport}
              style={{ background: '#059669', color: 'white' }}
            >
              {isLoading ? 'Excel生成中...' : 'Excelをダウンロード'}
            </Button>
          </Flex>
        </Box>
      )}
    </Box>
  );
}
