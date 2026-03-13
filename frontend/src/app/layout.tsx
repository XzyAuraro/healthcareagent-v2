import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Healthcare Assistant',
  description: 'AI-powered healthcare decision support workstation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-display antialiased">{children}</body>
    </html>
  );
}
