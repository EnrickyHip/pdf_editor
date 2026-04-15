'use client';

import { SessionProvider } from 'next-auth/react';
import { GlobalStyles } from '@/styles/globalStyles';
import { theme } from '@/styles/theme';
import { ThemeProvider } from 'styled-components';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          <ThemeProvider theme={theme}>
            <GlobalStyles />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
