import type { Metadata } from 'next';
import './globals.css';
import BrowserEchoScript from '@browser-echo/next/BrowserEchoScript';
import { QueryProvider } from './providers/query-provider';

export const metadata: Metadata = {
  title: 'Verba',
  description: 'The GoldenRAGtriever',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="icon.ico" rel="icon" />
        <link href="static/icon.ico" rel="icon" />
        {process.env.NODE_ENV === 'development' && (
          <BrowserEchoScript route="/api/client-logs" />
        )}
        {process.env.NODE_ENV === 'development' && (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Enhanced console logging for development
                (function() {
                  const originalLog = console.log;
                  const originalWarn = console.warn;
                  const originalError = console.error;
                  const originalInfo = console.info;

                  function enhanceConsole(method, name, color) {
                    return function(...args) {
                      method.apply(console, args);
                      // Enhanced formatting for better debugging
                      const timestamp = new Date().toLocaleTimeString();
                      const prefix = \`%c[Verba Browser \${timestamp}]\`;
                      method(prefix, \`color: \${color}; font-weight: bold;\`, ...args);
                    };
                  }

                  console.log = enhanceConsole(originalLog, 'LOG', '#2196F3');
                  console.warn = enhanceConsole(originalWarn, 'WARN', '#FF9800');
                  console.error = enhanceConsole(originalError, 'ERROR', '#F44336');
                  console.info = enhanceConsole(originalInfo, 'INFO', '#4CAF50');
                })();
              `,
            }}
          />
        )}
      </head>
      <body className="verba-container">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
