/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx,vue,svelte}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        popover: {
          DEFAULT: '#ffffff',
          foreground: '#000000',
        },
      },
    },
  },
  plugins: [],
};
