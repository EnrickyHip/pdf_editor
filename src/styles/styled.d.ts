import 'styled-components';
import { theme } from '@/styles/theme';

declare module 'styled-components' {
  interface DefaultTheme extends Record<string, unknown> {
    colors: typeof theme.colors;
  }
}
