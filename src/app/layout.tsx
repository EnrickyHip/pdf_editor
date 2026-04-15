'use client';

import { GlobalStyles } from '@/styles/globalStyles';
import { theme } from '@/styles/theme';
import { ThemeProvider } from 'styled-components';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThemeProvider theme={theme}>
          <GlobalStyles />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
