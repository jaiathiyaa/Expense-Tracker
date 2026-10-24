export const lightColors = {
  primary: '#5145F5',
  primaryLight: '#EEF0FF',
  primaryDark: '#3E34C7',
  primaryHover: '#4438E3',
  background: '#F6F8FC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',
  border: '#E2E8F0',
  borderActive: '#5145F5',
  borderError: '#EF4444',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textLight: '#FFFFFF',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  errorBorder: '#FCA5A5',
  success: '#10B981',
  successLight: '#D1FAE5',
  successBorder: '#6EE7B7',
  warning: '#F59E0B',
  cardShadow: 'rgba(15, 23, 42, 0.06)',
};

export const darkColors = {
  primary: '#6366F1',
  primaryLight: '#1E1B4B',
  primaryDark: '#4338CA',
  primaryHover: '#4F46E5',
  background: '#0B0F19',
  surface: '#151C2C',
  surfaceSubtle: '#1E293B',
  border: '#283548',
  borderActive: '#6366F1',
  borderError: '#EF4444',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textLight: '#FFFFFF',
  error: '#F87171',
  errorLight: '#3B1D24',
  errorBorder: '#7F1D1D',
  success: '#34D399',
  successLight: '#064E3B',
  successBorder: '#047857',
  warning: '#FBBF24',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
};

export const theme = {
  colors: { ...lightColors },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    hero: 40,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  typography: {
    hero: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 36,
      letterSpacing: -0.5,
    },
    title: {
      fontSize: 22,
      fontWeight: '700' as const,
      lineHeight: 30,
      letterSpacing: -0.3,
    },
    subtitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    bodyBold: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 22,
    },
    caption: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
  },
  shadows: {
    soft: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.05,
      shadowRadius: 12,
      elevation: 2,
    },
    medium: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
      elevation: 4,
    },
    button: {
      shadowColor: '#5145F5',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.28,
      shadowRadius: 14,
      elevation: 4,
    },
  },
};

export type Theme = typeof theme;

const DARK_THEME_STYLE_ID = 'expense-tracker-dark-theme-override';

const DARK_CSS = `
html[data-theme="dark"], body.dark-theme, html[data-theme="dark"] #root {
  background-color: #0B0F19 !important;
  color: #F8FAFC !important;
}

/* Backgrounds */
html[data-theme="dark"] .r-backgroundColor-y7f2pq {
  background-color: #0B0F19 !important;
}
html[data-theme="dark"] .r-backgroundColor-14lw9ot {
  background-color: #151C2C !important;
}
html[data-theme="dark"] .r-backgroundColor-11j01x2 {
  background-color: #1E293B !important;
}

/* Text colors */
html[data-theme="dark"] .r-color-15ijx5m {
  color: #F8FAFC !important;
}
html[data-theme="dark"] .r-color-1s7ct43 {
  color: #94A3B8 !important;
}
html[data-theme="dark"] .r-color-1npgj5g {
  color: #64748B !important;
}

/* Borders */
html[data-theme="dark"] .r-borderColor-1wr2p1e {
  border-color: rgba(255, 255, 255, 0.09) !important;
}
html[data-theme="dark"] .r-borderBottomColor-eaxd7d {
  border-bottom-color: rgba(255, 255, 255, 0.09) !important;
}
html[data-theme="dark"] .r-borderTopColor-174iedc {
  border-top-color: rgba(255, 255, 255, 0.09) !important;
}
html[data-theme="dark"] .r-borderBottomColor-1kj3flp {
  border-bottom-color: rgba(255, 255, 255, 0.06) !important;
}

/* Form inputs & textareas */
html[data-theme="dark"] input,
html[data-theme="dark"] textarea {
  color: #F8FAFC !important;
}

/* Neutral badges */
html[data-theme="dark"] [style*="background-color: rgb(241, 245, 249)"],
html[data-theme="dark"] [style*="background-color: rgb(248, 250, 252)"] {
  background-color: #1E293B !important;
}

/* Icons, inline text & SVG strokes/fills matching dark textPrimary */
html[data-theme="dark"] [style*="color: rgb(15, 23, 42)"],
html[data-theme="dark"] [style*="color: #0F172A"],
html[data-theme="dark"] [style*="color:#0F172A"],
html[data-theme="dark"] [style*="color:#0f172a"] {
  color: #F8FAFC !important;
}

html[data-theme="dark"] svg[fill="#0F172A"],
html[data-theme="dark"] svg [fill="#0F172A"] {
  fill: #F8FAFC !important;
}

html[data-theme="dark"] svg[stroke="#0F172A"],
html[data-theme="dark"] svg [stroke="#0F172A"] {
  stroke: #F8FAFC !important;
}
`;

export const applyThemeMode = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';
  Object.assign(theme.colors, isDark ? darkColors : lightColors);

  if (typeof document !== 'undefined') {
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      if (document.body) document.body.classList.add('dark-theme');
      let styleEl = document.getElementById(DARK_THEME_STYLE_ID);
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = DARK_THEME_STYLE_ID;
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = DARK_CSS;
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (document.body) document.body.classList.remove('dark-theme');
      const styleEl = document.getElementById(DARK_THEME_STYLE_ID);
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    }
  }
};
