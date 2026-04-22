# High-Performance Design System: Editorial Athletics

## 1. Overview & Creative North Star
### The Performance Monolith
This design system is built for the "High-Performance Athlete." It moves away from the friendly, rounded aesthetic of mass-market fitness apps and moves toward an aesthetic of **Organic Brutalism**. The goal is to make the user feel like they are interacting with a piece of precision-engineered equipment. 

To achieve a "high-end editorial" feel, we break the traditional grid through **intentional asymmetry**. We treat white space (or in this case, "black space") as a luxury. By combining the massive, technical weight of `Space Grotesk` with the deep, infinite voids of `#0e0e0e`, we create a high-contrast environment where data feels like a tactical readout. This is not just a tracker; it is a digital coach that demands respect.

---

## 2. Colors & Surface Philosophy
The palette is rooted in the "Void and Electric" concept. The deep blacks provide a canvas for the electric lime to pop with maximum retinal impact.

### Surface Hierarchy & Nesting
We do not use flat layouts. We treat the UI as a series of physical layers—like stacked sheets of carbon fiber or dark frosted glass.
- **The "No-Line" Rule:** 1px solid borders are strictly prohibited for sectioning. Boundaries must be defined solely through background shifts. For example, a `surface-container-low` card sitting on a `surface` background creates a natural, sophisticated separation.
- **The Layering Principle:** Depth is achieved by "stacking" the surface-container tiers. 
    - **Base:** `surface` (#0e0e0e)
    - **Sectioning:** `surface-container-low` (#131313)
    - **Interactive Cards:** `surface-container-high` (#201f1f)
- **Signature Textures (The High-Performance Glow):** For primary CTAs or high-motivation cards, use a subtle gradient transitioning from `primary` (#f6ffc0) to `primary-container` (#daf900). This adds a "soul" to the color that flat hex codes cannot achieve.
- **The Glass & Gradient Rule:** For elements that float (like the bottom navigation or top alerts), use Glassmorphism. Utilize semi-transparent versions of `surface-container` with a `20px` to `40px` backdrop-blur.

---

## 3. Typography
Typography is our primary tool for establishing "The Performance Monolith" identity.

### Headline & Display: Space Grotesk
This font is technical, bold, and aggressive. 
- **Usage:** Use `display-lg` and `headline-lg` for daily goals or "Hardcore" motivational headers. 
- **Styling:** Use `all-caps` and `tight letter-spacing` (-0.02em) for headline-level text to mimic high-end editorial magazines.

### Body & Labels: Manrope
Manrope provides the "Accessible" balance to the "Hardcore" typography.
- **Usage:** All data readouts, descriptions, and list items. 
- **The Hierarchy:** By pairing a massive `display-lg` headline with a tiny but sharp `label-md` in `on-surface-variant` (#adaaaa), we create a high-contrast scale that feels premium and intentional.

---

## 4. Elevation & Depth
In this system, elevation is perceived through light, not structural lines.

- **Ambient Shadows:** Standard drop shadows are too "standard." When a floating effect is required (e.g., a workout modal), use extra-diffused shadows (Blur: 40px+) at a very low 4-8% opacity. The shadow color should be tinted with `primary` to mimic the glow of the lime green against the dark surface.
- **The "Ghost Border" Fallback:** If a layout requires a container for accessibility (like the "Duration" badge in the reference image), use a **Ghost Border**. This is the `outline-variant` (#494847) set at **15% opacity**. It should be felt, not seen.
- **Tonal Layering:** To separate "Shredding 2K26" from "Till the Death," do not use a line. Use `surface-container-lowest` for the background of the bottom list and `surface-container-low` for the cards above it.

---

## 5. Components

### Cards & Containers
- **The Layout:** Use `Roundedness.xl` (1.5rem) for high-impact motivation cards and `Roundedness.lg` (1rem) for standard list items.
- **Spacing:** Forbid the use of divider lines. Separate card groups using `Spacing.10` (2.5rem). Within a card, use `Spacing.4` (1rem) for internal padding.
- **The "Hero" Card:** The daily motivation card should use the `primary` (#f6ffc0) background with `on-primary` (#586500) text. This inversion signals high importance.

### Buttons
- **Primary:** Full `primary` fill. No border. Use `on-primary` for text. Square-ish corners (`Roundedness.md`) convey strength.
- **Secondary (The Glass Button):** Semi-transparent `surface-variant` with a backdrop blur. Use a "Ghost Border" of `outline-variant` at 20% opacity.
- **Tertiary:** Text-only in `primary` color, all-caps, `label-md` styling.

### Inputs & Progress
- **Input Fields:** Use `surface-container-highest` with no border. The active state is signaled by a 2px bottom-bar in `primary`.
- **Progress Rings:** Use a thick `primary` stroke for the progress and `surface-container-highest` for the empty track.

---

## 6. Do's and Don'ts

### Do:
- **Do** use `display-lg` typography for single-word emphasis (e.g., "RISE," "PUSH").
- **Do** allow content to bleed off the edges of the grid slightly (e.g., a horizontal scrolling list of workout groups) to create a sense of scale.
- **Do** use "Ghost Borders" for nested elements inside high-contrast cards.
- **Do** use the `primary` accent sparingly to maintain its "electric" impact.

### Don't:
- **Don't** use 1px solid white or grey lines to separate content. It breaks the "Performance Monolith" immersion.
- **Don't** use standard Material or iOS shadows. They look "cheap" in a high-end editorial context.
- **Don't** use more than three levels of surface hierarchy in one view. It creates visual noise.
- **Don't** use center-alignment for long-form text. Editorial layouts favor left-aligned, authoritative blocks.