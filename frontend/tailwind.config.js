/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // Safelist fill colors for Tremor charts
    'fill-blue-500',
    'fill-orange-500',
    'fill-purple-500',
    'fill-emerald-500',
    'fill-amber-500',
    'fill-teal-500',
    'fill-gray-500',
    'fill-rose-500',
    'fill-cyan-500',
    'fill-indigo-500',
    // Stroke colors for Tremor charts
    'stroke-blue-500',
    'stroke-orange-500',
    'stroke-purple-500',
    'stroke-emerald-500',
    'stroke-amber-500',
    'stroke-teal-500',
    'stroke-gray-500',
    'stroke-rose-500',
    // Dark mode variants
    'dark:fill-blue-500',
    'dark:fill-orange-500',
    'dark:fill-purple-500',
    'dark:fill-emerald-500',
    'dark:fill-amber-500',
    'dark:fill-teal-500',
    'dark:fill-gray-500',
    'dark:fill-rose-500',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
