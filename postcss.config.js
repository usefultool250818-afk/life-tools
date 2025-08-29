// postcss.config.js
module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},  // ← これだけでOK（autoprefixerは不要）
  },
};
