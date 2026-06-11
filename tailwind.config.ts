import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        surface: 'var(--color-surface)',
        background: 'var(--color-background)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        textMuted: 'var(--color-text-muted)',
      },
    },
  },
  plugins: [],
};
export default config;
