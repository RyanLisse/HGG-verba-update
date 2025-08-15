import type { Config } from 'tailwindcss';

const config: Config = {
  theme: {
    screens: {
      sm: '100px',
      md: '930px',
      lg: '1280px',
      full: '1700px',
    },
    extend: {
      colors: {
        'bg-verba': 'var(--bg-verba, #ffffff)',
        'bg-alt-verba': 'var(--bg-alt-verba, #f1f5f9)',
        'button-verba': 'var(--button-verba, #fbbf24)',
        'button-hover-verba': 'var(--button-hover-verba, #f59e0b)',
        'primary-verba': 'var(--primary-verba, #10b981)',
        'secondary-verba': 'var(--secondary-verba, #fbbf24)',
        'warning-verba': 'var(--warning-verba, #ef4444)',
        'text-verba': 'var(--text-verba, #1f2937)',
        'text-alt-verba': 'var(--text-alt-verba, #6b7280)',
        'text-verba-button': 'var(--text-verba-button, #1f2937)',
        'text-alt-verba-button': 'var(--text-alt-verba-button, #ffffff)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
};

export default config;
