'use client';

import { useState, useRef, useEffect } from 'react';
import { Box, Flex, Text, Button, TextArea } from '@radix-ui/themes';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GuideStepCard, StepData } from './GuideStepCard';
import type { DrawingInfo } from '@/lib/gemini';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  drawingInfo: DrawingInfo | null;
}

function parseSteps(text: string): StepData[] | null {
  const match = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (parsed.steps && Array.isArray(parsed.steps)) {
      return parsed.steps;
    }
  } catch {
    // ignore
  }
  return null;
}

function cleanMessageText(text: string): string {
  return text.replace(/```json[\s\S]*?```/g, '').trim();
}

function parseChoices(text: string): string[] {
  const sectionMatch = text.match(/【選択肢】([\s\S]*?)(?:\n\n|$)/);
  if (!sectionMatch) return [];
  const lines = sectionMatch[1].split('\n');
  return lines
    .map(l => l.replace(/^[-・]\s*/, '').trim())
    .filter(l => l.length > 0 && !l.includes('自由入力可'));
}

function buildInitialMessage(info: DrawingInfo | null): string {
  if (!info || (info.pipeSystems.length === 0 && info.fixtures.length === 0)) {
    return '配管作図を支援します。まず、現場名と配管種別（給水・給湯・追焚・排水など）を教えてください。';
  }
  const parts: string[] = [];
  if (info.drawingType) parts.push(`図面種別: ${info.drawingType}`);
  if (info.pipeSystems.length > 0) parts.push(`配管系統: ${info.pipeSystems.map(p => `${p.type}(主管${p.mainDiameter})`).join('・')}`);
  if (info.fixtures.length > 0) parts.push(`接続器具: ${info.fixtures.map(f => `${f.name}×${f.count}`).join('・')}`);
  if (info.scaleDimension) parts.push(`縮尺基準寸法: ${info.scaleDimension}`);
  if (info.siteRules.length > 0) parts.push(`現場ルール: ${info.siteRules.map(r => r.description).join(' / ')}`);

  const firstQuestion = info.uncertainItems.length > 0
    ? `\n\n${info.uncertainItems[0].suggestedQuestion}`
    : '\n\n現場名を教えてください。';

  return `図面を解析しました。\n${parts.join('\n')}${firstQuestion}`;
}

export function GuideChat({ drawingInfo }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: buildInitialMessage(drawingInfo),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [steps, setSteps] = useState<StepData[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput ?? input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');  // 選択肢ボタン・自由入力どちらでも必ずクリア
    setIsLoading(true);

    const apiMessages = updatedMessages.map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/guide-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages, drawingInfo }),
      });

      if (!res.body) throw new Error('No stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      const assistantMessage: Message = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;

        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullText };
          return updated;
        });
      }

      const parsedSteps = parseSteps(fullText);
      if (parsedSteps) {
        setSteps(parsedSteps);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
  const choices = lastAssistantMessage ? parseChoices(lastAssistantMessage.content) : [];

  return (
    <Flex style={{ height: '100%', gap: 0 }}>
      {/* 左ペイン：チャット */}
      <Flex
        direction="column"
        style={{
          flex: '0 0 60%',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          height: '100%',
        }}
      >
        {/* メッセージ一覧 */}
        <Box style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {messages.map((msg, i) => (
            <Flex
              key={i}
              justify={msg.role === 'user' ? 'end' : 'start'}
              style={{ marginBottom: '1rem' }}
            >
              <Box
                style={{
                  maxWidth: '80%',
                  padding: '0.75rem 1rem',
                  borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.role === 'user'
                    ? 'rgba(124,58,237,0.2)'
                    : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.1)'}`,
                }}
              >
                {msg.role === 'user' ? (
                  <Text size="2" style={{ color: '#e8eaf6', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {msg.content}
                  </Text>
                ) : (
                  <div style={{ color: '#e8eaf6', fontSize: '0.875rem', lineHeight: '1.7' }} className="markdown-body">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p style={{ margin: '0 0 0.5rem' }}>{children}</p>,
                        h2: ({ children }) => <h2 style={{ color: '#c4b5fd', fontSize: '1rem', fontWeight: 700, margin: '0.75rem 0 0.25rem' }}>{children}</h2>,
                        h3: ({ children }) => <h3 style={{ color: '#c4b5fd', fontSize: '0.9rem', fontWeight: 600, margin: '0.5rem 0 0.25rem' }}>{children}</h3>,
                        ul: ({ children }) => <ul style={{ margin: '0.25rem 0', paddingLeft: '1.25rem' }}>{children}</ul>,
                        li: ({ children }) => <li style={{ marginBottom: '0.15rem' }}>{children}</li>,
                        strong: ({ children }) => <strong style={{ color: '#e8eaf6', fontWeight: 700 }}>{children}</strong>,
                        code: ({ children }) => <code style={{ background: 'rgba(124,58,237,0.2)', padding: '0.1rem 0.3rem', borderRadius: '3px', fontSize: '0.8rem', fontFamily: 'monospace' }}>{children}</code>,
                        hr: () => <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '0.5rem 0' }} />,
                        table: ({ children }) => <table style={{ borderCollapse: 'collapse', width: '100%', margin: '0.5rem 0', fontSize: '0.8rem' }}>{children}</table>,
                        th: ({ children }) => <th style={{ border: '1px solid rgba(124,58,237,0.4)', padding: '0.3rem 0.5rem', background: 'rgba(124,58,237,0.15)', color: '#c4b5fd', fontWeight: 600, textAlign: 'left' }}>{children}</th>,
                        td: ({ children }) => <td style={{ border: '1px solid rgba(255,255,255,0.1)', padding: '0.3rem 0.5rem', color: '#e8eaf6' }}>{children}</td>,
                        ol: ({ children }) => <ol style={{ margin: '0.25rem 0', paddingLeft: '1.5rem' }}>{children}</ol>,
                      }}
                    >
                      {cleanMessageText(msg.content)}
                    </ReactMarkdown>
                  </div>
                )}
              </Box>
            </Flex>
          ))}
          {isLoading && (
            <Flex justify="start" style={{ marginBottom: '1rem' }}>
              <Box style={{
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <Text size="2" style={{ color: 'var(--gray-9)' }}>考え中...</Text>
              </Box>
            </Flex>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* 選択肢ボタン */}
        {!isLoading && choices.length > 0 && (
          <Box style={{
            padding: '0.75rem 1rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(0,0,0,0.2)',
          }}>
            <Text size="1" style={{ color: 'var(--gray-9)', display: 'block', marginBottom: '0.5rem' }}>
              選択肢から選ぶか、下のテキストエリアに自由入力できます
            </Text>
            <Flex gap="2" wrap="wrap">
              {choices.map((choice, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="2"
                  onClick={() => handleSend(choice)}
                  data-testid={`choice-button-${i}`}
                  style={{
                    borderColor: 'rgba(124,58,237,0.4)',
                    color: '#c4b5fd',
                    fontSize: '0.8rem',
                  }}
                >
                  {choice}
                </Button>
              ))}
            </Flex>
          </Box>
        )}

        {/* 入力エリア */}
        <Box style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <Flex gap="3" align="end">
            <TextArea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力（Enter で送信、Shift+Enter で改行）"
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#e8eaf6',
                minHeight: '80px',
                resize: 'none',
              }}
            />
            <Button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              size="3"
              style={{
                background: '#7c3aed',
                color: 'white',
                flexShrink: 0,
              }}
            >
              送信
            </Button>
          </Flex>
        </Box>
      </Flex>

      {/* 右ペイン：Rebro操作ステップ */}
      <Box
        style={{
          flex: '0 0 40%',
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.2)',
        }}
      >
        {steps.length > 0 ? (
          <GuideStepCard steps={steps} />
        ) : (
          <Flex
            direction="column"
            align="center"
            justify="center"
            style={{ height: '100%', padding: '2rem', textAlign: 'center' }}
          >
            <Text size="2" style={{ color: 'var(--gray-9)', lineHeight: '1.6' }}>
              チャットで現場情報を入力すると、
              Rebro操作ステップが
              ここに表示されます。
            </Text>
          </Flex>
        )}
      </Box>
    </Flex>
  );
}
