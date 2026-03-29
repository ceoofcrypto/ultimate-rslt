/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      colors: {
        school: {
          50: '#f0f4ff',
          100: '#e0e9fe',
          200: '#c1d3fe',
          300: '#91b1fd',
          400: '#5c80f6',
          500: '#3350e8',
          600: '#2539cd',
          700: '#1f2da4',
          800: '#1e2884',
          900: '#1e266a',
          950: '#11153e',
        },
      },
    },
  },
  plugins: [],
}
