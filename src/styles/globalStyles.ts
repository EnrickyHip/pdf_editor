import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html {
    font-family: ${({ theme }) => theme.font.family};
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) => theme.colors.background};
    font-size: clamp(0.875rem, 1.8vw, 1rem);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  body {
    min-height: 100dvh;
  }

  a {
    color: ${({ theme }) => theme.colors.accent};
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.colors.accentHover};
    }
  }

  button {
    font-family: inherit;
    font-size: inherit;
    cursor: pointer;
  }

  input {
    font-family: inherit;
    font-size: inherit;
  }

  :focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }
`;
