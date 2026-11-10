// The admin app's design system (global.css) is plain CSS — no Tailwind.
// This local config (empty plugin set) stops PostCSS from walking up to the
// repo root, whose postcss.config.js loads tailwindcss (not installed here).
module.exports = {
  plugins: {},
};
