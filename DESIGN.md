---
name: Halloween AR Ghost Hunt
description: A live night-hunt field interface for mobile players and their event host.
colors:
  night: "#09070f"
  night-raised: "#12101b"
  field: "#0d0b14"
  ink: "#f6f0e6"
  ink-soft: "#d4ccdc"
  muted: "#aaa2b7"
  muted-deep: "#8d869b"
  line: "#2b2639"
  line-strong: "#3a3349"
  orange: "#ff7a1a"
  orange-hover: "#ff9144"
  orange-ink: "#120b06"
  warning: "#ffb36b"
  cyan: "#7df9e7"
  violet: "#b9a4ff"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 0.92
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Bricolage Grotesque Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.18em"
  room-code:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "2.25rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "0.16em"
rounded:
  link: "2px"
  control: "12px"
  sheet: "16px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.orange-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "16px 20px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.orange-hover}"
    textColor: "{colors.orange-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "16px 20px"
    height: "56px"
  text-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
    height: "56px"
  sheet-card:
    backgroundColor: "{colors.night-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "20px"
  status-live:
    textColor: "{colors.cyan}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
    height: "36px"
---

# Design System: Halloween AR Ghost Hunt

## Overview

**Creative North Star: "The Night-Hunt Field Pass"**

The interface should feel like admission to a live after-dark hunt: immediate, coded, and operational rather than promotional. Ink-black violet space, oversized bone-white instructions, precise monospace signals, and a single hot orange action establish the event atmosphere without turning the screen into Halloween decoration.

The world is intentionally sparse. Fine lavender rules and translucent field-sheet surfaces organize live state while cyan marks the connection signal. The shipped login, lobby, and host views keep essential tasks prominent on narrow phones and allow the same hierarchy to breathe on desktop.

**Key Characteristics:**

- Near-black, edge-to-edge canvas with subtle violet and cyan ambient light.
- Heavy, tightly tracked Bricolage Grotesque headlines paired with coded monospace metadata.
- Safety-orange primary actions, cyan connection signals, and lavender emphasis.
- Thin rules, modest 12–16px corners, and large room codes instead of generic dashboard chrome.
- Text accompanies every color-coded state; touch controls remain at least 44px tall.

## Colors

The palette behaves like event-safety lighting on a nearly black field: orange calls for action, cyan confirms live connection, and lavender carries atmosphere and secondary emphasis.

### Primary

- **Safety Orange** (`orange`, #ff7a1a): the sole primary-action color and the fill for the ghost mark.
- **Hot Orange** (`orange-hover`, #ff9144): the implemented hover state for primary actions.
- **Soot Ink** (`orange-ink`, #120b06): high-contrast copy and icons placed on orange.

### Secondary

- **Signal Cyan** (`cyan`, #7df9e7): live connection, current-player, successful-copy, focus, and presence signals.
- **Spectral Lavender** (`violet`, #b9a4ff): headline emphasis, secondary actions, numbered roster badges, and lobby state.
- **Ember Warning** (`warning`, #ffb36b): recoverable errors and reconnecting states.

### Neutral

- **Event Night** (`night`, #09070f): the full-viewport canvas.
- **Raised Night** (`night-raised`, #12101b): translucent field sheets and roster surfaces.
- **Field Black** (`field`, #0d0b14): input wells.
- **Bone White** (`ink`, #f6f0e6): primary copy and display type.
- **Soft Bone** (`ink-soft`, #d4ccdc): labels and supporting copy that still needs emphasis.
- **Night Mist** (`muted`, #aaa2b7): body copy and utility links.
- **Deep Mist** (`muted-deep`, #8d869b): help text and secondary roster detail.
- **Lavender Rule** (`line`, #2b2639): dividers within lists.
- **Strong Lavender Rule** (`line-strong`, #3a3349): sheet outlines and major separators.

**The Signal Color Rule.** Cyan means connected, current, focused, or successfully completed; never use it as a competing primary action.

**The One Hot Action Rule.** Orange identifies the immediate action. Keep it rare enough that the next step is obvious at a glance.

## Typography

**Display Font:** Bricolage Grotesque Variable (with `ui-sans-serif`, `system-ui`, and `sans-serif` fallbacks)  
**Body Font:** Bricolage Grotesque Variable (with the same fallbacks)  
**Label/Mono Font:** `ui-monospace`, SFMono-Regular, Menlo, Monaco, Consolas, monospace

**Character:** Bricolage Grotesque makes the hunt playful and forceful without novelty lettering. Monospace is reserved for room codes, channel labels, and compact machine-like state, so operational information reads as a signal rather than prose.

### Hierarchy

- **Display** (900, 3rem mobile, 0.92 line-height, -0.04em tracking): short page theses; shipped views increase to 4.5–7.1rem at wider breakpoints.
- **Headline** (800, 1.5rem, 1.2 line-height, -0.03em tracking): sheet and roster titles; prominent host roster headings reach 1.875rem.
- **Body** (400, 1rem, 1.75 line-height): instructions, privacy guidance, and operational explanations; muted copy is kept to compact reading measures around 28–32rem.
- **Label** (700, 0.75rem, 0.18em tracking, uppercase): room labels, channel names, and state metadata.
- **Room Code** (900, 2.25rem mobile, 1 line-height, 0.16em tracking): the six-character public room code; host desktop presentation rises to 3rem.

**The Two-Voice Rule.** Bricolage speaks to people; monospace identifies rooms, channels, and terse system state.

**The Short-Display Rule.** Reserve the largest, tightest type for brief commands or rallying lines. Longer explanation stays in body scale.

## Layout

Every surface begins with safe-area-aware top and bottom padding and a 20px phone gutter that grows to 32px from the small breakpoint. Player lobby content is constrained to 64rem; login and host content use a 72rem maximum. Mobile flows are single-column and content-led. At the large breakpoint, login and host views become asymmetric two-column grids, keeping the field statement separate from the operational sheet.

Vertical spacing follows an 8px base rhythm, most visibly through 16, 20, 24, 32, and 40px steps. On phones, the brand and first task stay within the opening viewport where content length permits. Room codes receive their own ruled or orange-keyed block so they can be found and copied without scanning surrounding prose.

**The Camera-Ready Density Rule.** Keep authentication and lobby UI compact, touch-safe, and portrait-first; desktop adds breathing room, not a second marketing story.

## Elevation & Depth

Depth is a restrained hybrid of tonal layering and ambient light. The page itself carries two broad radial gradients over Event Night. Field sheets use a translucent Raised Night fill, a Strong Lavender Rule, and a diffuse black shadow (`0 20px 60px rgba(0,0,0,0.18)` on roster sheets; `0 20px 60px rgba(0,0,0,0.22)` on the login sheet). Orange and cyan may glow only where they signal action or live state.

### Shadow Vocabulary

- **Field Sheet:** `0 20px 60px rgba(0,0,0,0.18)`: separates live roster surfaces from the canvas without making them float like generic cards.
- **Join Sheet:** `0 20px 60px rgba(0,0,0,0.22)`: slightly firmer depth behind the active login task.
- **Action Ember:** `0 0 24px rgba(255,122,26,0.45)`: the short orange keyline on the join sheet.
- **Presence Signal:** `0 0 12px rgba(125,249,231,0.65)`: the connected-player dot only.
- **Brand Ember:** `0 0 28px rgba(255,122,26,0.25)`: a quiet halo around the ghost mark.

**The Local Glow Rule.** Glows belong to the brand mark, an active orange keyline, or a live cyan presence dot—not to whole panels or decorative text.

## Shapes

The form language mixes softly curved field sheets with squared operational details. Inputs and primary player controls use a comfortable 12px radius; roster and join sheets use 16px. Status badges and the ghost mark are fully rounded. Host room-code controls, list dividers, fallback actions, and empty states stay square, preventing the system from dissolving into a collection of pills and cards.

Borders are one-pixel lavender-gray rules. A two-pixel orange or muted-lavender left rule introduces active instructions and operational notes. The crisp circular ghost mark is the only recurring illustrated silhouette in this surface.

**The Selective Radius Rule.** Curve containment and touch controls; keep information rules, room-code utilities, and structural lists crisp.

## Components

### Buttons

- **Shape:** primary player controls use gently curved corners (12px); the host create control and fallback links are deliberately square.
- **Primary:** Safety Orange with Soot Ink copy, a 56px desktop/small-breakpoint height, 20px horizontal padding, and an extra-bold label. The player join action spans its field-sheet width.
- **Hover / Focus / Active:** hover brightens to Hot Orange; active moves down by one pixel. The shared keyboard focus is a 3px Signal Cyan outline with a 3px offset. Disabled buttons switch to a dark brown field with muted copy and a not-allowed cursor.
- **Utility:** the 48px square copy control uses a Strong Lavender Rule, Spectral Lavender icon, and no corner radius; hover strengthens both border and icon.

### Chips

- **Style:** live and lobby badges are 36px-high pills with uppercase, tracked labels. Their border and background are low-opacity versions of their semantic color.
- **State:** Signal Cyan identifies live; Spectral Lavender identifies lobby; Ember Warning identifies reconnecting. Text is always present beside the icon.

### Cards / Containers

- **Corner Style:** field-sheet corners (16px) for join and roster surfaces.
- **Background:** translucent Raised Night over the ambient canvas.
- **Shadow Strategy:** use the Field Sheet or Join Sheet shadow from Elevation & Depth.
- **Border:** one-pixel Strong Lavender Rule.
- **Internal Padding:** 20px on phones, increasing to 28–40px with viewport and surface role.

### Inputs / Fields

- **Style:** Field Black well, Bone White text, Strong Lavender control border, 12px radius, 16px horizontal padding, and a 48–56px minimum height.
- **Focus:** border shifts to Signal Cyan while the global 3px cyan focus-visible outline remains available to keyboard users.
- **Code Variant:** room codes use monospace, uppercase, 900 weight, and 0.18em tracking; nickname fields retain the body face.
- **Error / Disabled:** errors appear as Ember Warning copy with an orange two-pixel left rule; placeholders and help remain visibly dimmer than entered content.

### Navigation

The persistent header pairs the compact ghost-mark brand lockup with a single underlined context switch such as “Host a game” or “Player check-in.” Links have at least 44px of touch height, muted default color, a subdued lavender underline, and Bone White hover color.

### Room Roster

The roster is a ruled list rather than a stack of mini-cards. Each row is at least 64px tall and combines a numbered lavender badge, bold player name, explicit connection copy, and a cyan or dim-gray status dot. The current player receives a written “You” marker in cyan.

### Room Code Signal

The public code is isolated behind a monospace label and large, heavily tracked numerals. Player views key the block with a two-pixel orange rule; host views place it between full-width rules and add the square copy control.

## Do's and Don'ts

### Do:

- **Do** keep Safety Orange focused on the primary action and its supporting signal mark.
- **Do** use Signal Cyan with explicit connection, focus, current-player, or success copy.
- **Do** keep controls at least 44px tall and preserve the 3px cyan focus-visible outline.
- **Do** use monospace selectively for room codes, channel labels, and terse state.
- **Do** preserve the single-column phone hierarchy before introducing the shipped large-screen split.
- **Do** honor reduced-motion preferences; the shipped room-signal entrance collapses to effectively immediate motion.

### Don't:

- **Don't** place authentication inside a white card or turn the desktop split into a marketing panel.
- **Don't** use cyan as a second primary action color or rely on color alone to communicate connection state.
- **Don't** round every surface; squared rules, lists, and room-code utilities are part of the field-pass character.
- **Don't** spread glows across large panels, paragraphs, or display headlines.
- **Don't** substitute decorative Halloween typography for the shipped Bricolage-and-monospace pairing.
- **Don't** introduce hover-only meaning on these touch-first surfaces.
