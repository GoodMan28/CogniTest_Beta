/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "../scratch/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'surface': '#f8f9ff',
        'surface-dim': '#cbdbf5',
        'surface-bright': '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#eff4ff',
        'surface-container': '#e5eeff',
        'surface-container-high': '#dce9ff',
        'surface-container-highest': '#d3e4fe',
        'on-surface': '#0b1c30',
        'on-surface-variant': '#434655',
        'inverse-surface': '#213145',
        'inverse-on-surface': '#eaf1ff',
        'outline': '#737686',
        'outline-variant': '#c3c6d7',
        'surface-tint': '#0053db',
        'primary': '#004ac6',
        'on-primary': '#ffffff',
        'primary-container': '#2563eb',
        'on-primary-container': '#eeefff',
        'inverse-primary': '#b4c5ff',
        'secondary': '#006c49',
        'on-secondary': '#ffffff',
        'secondary-container': '#6cf8bb',
        'on-secondary-container': '#00714d',
        'tertiary': '#943700',
        'on-tertiary': '#ffffff',
        'tertiary-container': '#bc4800',
        'on-tertiary-container': '#ffede6',
        'error': '#ba1a1a',
        'on-error': '#ffffff',
        'error-container': '#ffdad6',
        'on-error-container': '#93000a'
      },
      fontSize: {
        'headline-lg': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.05em', fontWeight: '600' }],
        'label-sm': ['11px', { lineHeight: '14px', fontWeight: '500' }],
      },
      spacing: {
        'container-padding': '24px',
        'gutter': '16px',
        'sidebar-width': '260px',
        'card-gap': '20px'
      }
    },
  },
  plugins: [],
}
