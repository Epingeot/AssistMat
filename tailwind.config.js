/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Brand colors (from app icon) ---
        lime:    "#C5D300",  // icon background, brand identity
        azure:   "#95D2DB",  // childminder figure
        magenta: "#EC52A6",  // child figure, accents
        peach:   "#DD8573",  // skin tone, warmth
        cream:   "#F4F1E2",  // soft neutral, surfaces

        // --- Semantic roles (what the color does in the UI) ---
        primary:    "#95D2DB",  // main interactive: buttons, links
        secondary:  "#EC52A6",  // accents, badges, highlights
        accent:     "#C5D300",  // brand pop, active states
        surface:    "#F4F1E2",  // cards, panels, modal backgrounds

        // --- Text ---
        "text-base":  "#2D3035",  // headings, body
        "text-muted": "#4A4A4A",  // subtitles, captions

        // --- Status ---
        success: "#C5D300",  // available slots, confirmations
        warning: "#FFAC33",  // caution states
        error:   "#F25833",  // errors, destructive actions
        info:    "#5672BC",  // informational messages
      },
    },
  },
  plugins: [],
}