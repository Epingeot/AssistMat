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
        brown:   "#483D32",  // hair, grounding element
        blue:    "#5672BC",  // informational, calming presence
        pink:    "#ffc9d7",  // highlights, active states

        // --- Semantic roles (what the color does in the UI) ---
        primary:    "#95D2DB",  // main interactive: buttons, links
        secondary:  "#EC52A6",  // accents, badges, highlights
        accent:     "#C5D300",  // brand pop, active states
        surface:    "#F4F1E2",  // cards, panels, modal backgrounds

        // --- Text ---
        // Keys are bare names (no "text-" prefix) so Tailwind generates utilities
        // like `text-ink` directly. A key of "text-ink" would produce `text-text-ink`.
        // Also: avoid the name "base" — collides with Tailwind's built-in text-base
        // font-size utility.
        ink:    "#483d32",  // headings, body, labels
        muted:  "#838A97",  // secondary text, captions (midway gray-500/400)
        subtle: "#9CA3AF",  // icons, placeholders, disabled, decorative hints (gray-400)

        // --- Borders ---
        line:     "#D1D5DB",  // default border: inputs, cards (gray-300)
        hairline: "#E5E7EB",  // subtle divider (gray-200)

        // --- Neutral backgrounds ---
        soft: "#F9FAFB",  // page background, hover of white buttons (gray-50)
        chip: "#F3F4F6",  // chips, pressed/active/disabled (gray-100)

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