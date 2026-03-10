import type { Metadata } from 'next';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rebro AI 縮尺解析デモ',
  description: 'AIが建築設備図面の縮尺を自動解析します',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <Theme appearance="dark" accentColor="cyan" grayColor="slate" radius="medium">
          {children}
        </Theme>
      </body>
    </html>
  );
}
