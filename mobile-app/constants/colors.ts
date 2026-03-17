/**
 * Custom color palette for Real Estate Mapper
 * Primary color: #31849B (Dark Teal)
 */

export const AppColors = {
  // Primary colors - #31849B as dominant
  primary: {
    main: "#31849B",      // Main dominant color - Dark teal
    light: "#43a5aa",     // Light variant
    lighter: "#63babe",   // Lighter variant
    lightest: "#98d1d5",  // Lightest variant
    dark: "#008995",      // Darker variant
  },

  // Accent color
  accent: "#FF0066",      // Hot pink/Magenta for accents

  // Neutral gray colors
  gray: {
    darkest: "#7F7F7F",   // Darkest gray
    dark: "#8e9091",      // Dark gray
    medium: "#a3a5a6",    // Medium gray
    light: "#bbbbbd",     // Light gray
    lighter: "#d2d3d3",   // Lighter gray
    lightest: "#f4f4f4",  // Lightest gray/background
  },

  // Semantic colors
  semantic: {
    success: "#43a5aa",   // Success - using primary light
    warning: "#FF0066",   // Warning - using accent
    error: "#FF0066",     // Error - using accent
    info: "#31849B",      // Info - using primary main
  },

  // UI components
  ui: {
    background: "#ffffff",
    surface: "#f4f4f4",
    border: "#d2d3d3",
    text: "#31849B",
    textSecondary: "#8e9091",
    textTertiary: "#a3a5a6",
  },
};
