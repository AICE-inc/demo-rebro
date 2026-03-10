'use client';

import { useRef, useState, useCallback } from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { Upload, FileText } from 'lucide-react';

interface Props {
  onNext: (imageBase64: string, fileName: string) => void;
}

export function GuideStep1Upload({ onNext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const base64Ref = useRef<string>('');

  const processFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('PDFファイルを選択してください');
      return;
    }
    setLoading(true);
    setFileName(file.name);

    const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
    GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await page.render({ canvasContext: canvas.getContext('2d') as any, canvas, viewport }).promise;

    const base64 = canvas.toDataURL('image/png').split(',')[1];
    base64Ref.current = base64;
    setPreview(canvas.toDataURL('image/png'));
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleSampleClick = useCallback(async () => {
    setLoading(true);
    setFileName('sample-drawing.pdf');
    const res = await fetch('/sample/sample-drawing.pdf');
    const blob = await res.blob();
    const file = new File([blob], 'sample-drawing.pdf', { type: 'application/pdf' });
    await processFile(file);
  }, [processFile]);

  const handleNext = () => {
    if (base64Ref.current) onNext(base64Ref.current, fileName);
  };

  return (
    <Flex direction="column" gap="6" align="center">
      <Box style={{ textAlign: 'center' }}>
        <Text size="6" weight="bold" style={{ color: '#e8eaf6', display: 'block' }}>
          配管図面をアップロード
        </Text>
        <Text size="3" style={{ color: 'var(--gray-10)', marginTop: '0.5rem', display: 'block' }}>
          給水・給湯・排水の配管図面を読み込みます
        </Text>
      </Box>

      <Box
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        style={{
          width: '100%',
          maxWidth: '480px',
          minHeight: '220px',
          border: `2px dashed ${isDragging ? '#7c3aed' : 'rgba(124,58,237,0.3)'}`,
          borderRadius: '16px',
          background: isDragging ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          gap: '1rem',
          padding: '2rem',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
        />
        {preview ? (
          <img src={preview} alt="図面プレビュー" style={{ maxWidth: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px' }} />
        ) : loading ? (
          <Text size="3" style={{ color: '#7c3aed' }}>変換中...</Text>
        ) : (
          <>
            <Upload size={40} style={{ color: 'rgba(124,58,237,0.5)' }} />
            <Text size="3" style={{ color: 'var(--gray-10)', textAlign: 'center' }}>
              クリックまたはドラッグ&amp;ドロップ<br />
              <Text size="2" style={{ color: 'var(--gray-9)' }}>PDFファイルのみ対応</Text>
            </Text>
          </>
        )}
      </Box>

      {fileName && (
        <Flex align="center" gap="2" style={{ color: 'var(--gray-10)' }}>
          <FileText size={16} />
          <Text size="2">{fileName}</Text>
        </Flex>
      )}

      <Flex gap="5" justify="center" align="center">
        <Button
          variant="ghost"
          size="3"
          onClick={handleSampleClick}
          disabled={loading}
          data-testid="sample-button"
          style={{ color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          サンプル図面で試す
        </Button>

        <Button
          size="3"
          onClick={handleNext}
          disabled={!preview || loading}
          data-testid="next-button"
          style={{
            background: preview && !loading ? '#7c3aed' : 'rgba(124,58,237,0.2)',
            color: preview && !loading ? 'white' : 'rgba(124,58,237,0.4)',
            fontWeight: 'bold',
            cursor: preview && !loading ? 'pointer' : 'not-allowed',
          }}
        >
          AI解析を開始 →
        </Button>
      </Flex>
    </Flex>
  );
}
