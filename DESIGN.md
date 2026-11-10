---
name: BAE Marketplace Frontend
description: A token-driven, rebrandable marketplace UI (BAE green default, DOME blue) in light and dark.
colors:
  primary: "#00724d"
  primary-bright: "#339988"
  primary-hover-bright: "#00c48c"
  primary-tint: "#d7f0e5"
  secondary-deep: "#0f3f2e"
  secondary-brand: "#145c41"
  secondary-table-header: "#015238"
  page-bg: "#F7F9FD"
  card-bg: "#ffffff"
  card-border: "#EBECEE"
  text-default: "#000000"
  text-secondary: "#374151"
  text-muted: "#6b7280"
  input-border: "#cbd5e1"
  danger: "#dc2626"
  success: "#15803d"
  warning: "#b45309"
  dark-page-bg: "#0b1117"
  dark-input-bg: "#1a2530"
  dark-input-border: "#334155"
  dome-primary: "#2d58a7"
  dome-primary-bright: "#00add3"
  dome-ink: "#0b1528"
typography:
  display:
    fontFamily: "Blinker, system-ui, sans-serif"
    fontWeight: 600
  body:
    fontFamily: "Blinker, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  label:
    fontFamily: "Blinker, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover-bright}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "#111827"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "10px 20px"
  card:
    backgroundColor: "{colors.card-bg}"
    rounded: "{rounded.2xl}"
  input:
    backgroundColor: "#ffffff"
    rounded: "{rounded.lg}"
---

# Design System: BAE Marketplace Frontend

## Overview

**Creative North Star: "The Themed Marketplace"**

One neutral, token-driven shell that rebrands per tenant. The structure (cards, tables, side navs, drawers, modals) never changes between BAE, DOME and any future theme; only the brand roles do (primary, secondary, page and header tints). Every color in a template is a role, never a literal, so switching theme or light/dark rewrites the whole interface from `src/styles.css` and the per-theme files in `src/app/themes`.

The personality is soft and confident: rounded-lg controls, generous 2xl cards, pill icon buttons, and ring-style focus. Surfaces are flat with light shadows; brand color is reserved for action, selection and table headers. Density is that of a B2B catalog and back-office: dense tables and forms next to roomier product cards.

**Key Characteristics:**
- Roles over literals: `text-content`, `bg-surface`, `border-line`, `text-on-primary`; no `dark:` variants on roles.
- Two brand colors per theme (a deep primary and a brighter sibling) plus a tinted secondary ramp.
- Light and dark are first-class; dark drops the tenant tint from inputs in favor of one neutral slate.
- Shared components (`app-button`, `app-card`, `app-modal`, `app-drawer`, `app-tabs`, `app-side-nav`, `app-dropdown-panel`) own their styling; pages compose them.

## Colors

A cool-neutral page with one saturated brand green (BAE default) and status colors held apart from the brand. Values below are BAE light mode; DOME is listed as a delta.

### Primary
- **Marketplace Green** (#00724d): the `--theme-primary-100` role. Filled buttons, links, table borders and icons, selected borders.
- **Bright Leaf** (#339988): the `--theme-primary-50` role. Focus rings (at 50%), stepper completion, hover tints. Deliberately darkened so white text stays readable on it.
- **Hover Mint** (#00c48c): BAE-only primary-button hover override.

### Secondary
- **Mint Tint** (#d7f0e5): selected rows and chips, row hover.
- **Deep Forest** (#0f3f2e): header background and hero depth.
- **Brand Forest** (#145c41) and **Table Header Green** (#015238): dark card surface and table headers.

### Neutral
- **Cool Page White** (#F7F9FD): page background.
- **Card White** (#ffffff) with **Mist Border** (#EBECEE): card surface and its edge.
- **Ink** (#000000), **Slate Text** (#374151), **Hint Gray** (#6b7280): default, secondary and muted text.
- **Input Slate** (#cbd5e1): input border in light mode.
- **Night Page** (#0b1117), **Input Night** (#1a2530), **Night Border** (#334155): dark page, input surface and input border, shared by every theme.

### Status
Danger (#dc2626), Success (#15803d), Warning (#b45309) for text; each has a soft background and border role. Info reuses the primary, mixed to 8% and 25% for its background and border.

### DOME delta
Primary **#2d58a7**, bright sibling **#00add3**, secondary tint **#dde6f6**, deep navy **#14274a**, header **#070f24**, and a navy-tinted neutral scale (ink #0b1528, secondary text #324153, hint #526179).

### Named Rules
**The Role Rule.** Templates carry class names only. No Tailwind palette colors (`text-gray-900`), no hex, no `var()` in HTML; a component gets its own class that reads the token in CSS.
**The One Source Rule.** A shared component's colors are CSS variables in `src/styles.css`, never hardcoded in its own scss, so any theme can override them by cascade.
**The Tint Not Swap Rule.** Hover, selected and info surfaces are derived from the primary with `color-mix()` or alpha, so a new theme needs only its seed colors.

## Typography

**Display Font:** Blinker (with system-ui, sans-serif); themeable via `--theme-font-display`
**Body Font:** Blinker (same stack); themeable via `--theme-font-body`
**Label/Mono Font:** Blinker for labels; monospace only in code editors. Inter is loaded in `index.html` as an alternate.

**Character:** Blinker is compact and slightly technical, which keeps dense tables and forms legible without feeling cold. Hierarchy comes from weight (400 to 600) and size, not from a second family.

### Hierarchy
- **Display** (600, hero and page titles): landing hero, page headings.
- **Body** (400, 1rem): paragraphs, form values.
- **Label** (600, 0.875rem): buttons, form labels, table headers.

### Named Rules
**The One Family Rule.** Blinker everywhere; change the family through the theme font variables, not per component.

## Layout

Tailwind utilities on a fluid page; pages compose shared shells: sidebar plus content (`app-side-nav`, which becomes a drawer on mobile), tabbed sections (`app-tabs`), and stacked `app-card` sections. Listings alternate grid and list through `app-view-toggle`. Forms and wizards use the stepper and dynamic form. Spacing follows the Tailwind scale (gap-2 inside controls, p-5 to p-6 in cards). Exact container widths vary per page and are not a system invariant.

## Elevation & Depth

Hybrid, leaning flat. Cards sit on the page with a 1px Mist Border and no shadow at rest; `shadow-sm` to `shadow-md` appears on hover and on small floating elements, `shadow-lg` on dropdowns, and `shadow-xl`/`2xl` on modals and drawers. Modals and drawers (CDK Overlay) sit on a themed overlay scrim (`rgb(0 0 0 / 40%)` light, 60% dark). In dark mode depth comes from tonal steps: page, then card, then inset (`--card-inset-bg`, the card mixed with 6% primary).

### Named Rules
**The Flat-At-Rest Rule.** Surfaces are flat until hovered, opened or floating.

## Shapes

Rounded but not bubbly. Controls and buttons use 8px (`rounded-lg`, the most common radius); cards and large panels 16px (`rounded-2xl`); small inline pieces 6px; chips, avatars and icon buttons are fully round (`rounded-full`). Borders are 1px in the card or input line role; selected cards swap to the primary border and Mint Tint fill.

## Components

Soft and confident: rounded corners, solid fills for the main action, ring focus.

### Buttons (`app-button`)
- **Shape:** 8px radius, or a circle in the pill icon variant (36px sm, 44px md).
- **Primary:** Marketplace Green fill, white text, `px-5 py-2.5` text-sm semibold.
- **Secondary:** transparent with a primary border and 10% primary hover tint.
- **Danger / Ghost / Neutral / Link:** red fill; gray text with gray hover; gray-bordered outline; primary-colored text.
- **Focus:** 4px ring at 30% of the bright primary. Disabled is 50% opacity with a not-allowed cursor.
- **Icons:** `prefixIcon`/`suffixIcon`; `spread` pins content left and the suffix right.

### Cards (`app-card`, `app-item-card`)
- **Corner Style:** 16px. **Background:** Card White (dark: tertiary navy-green or slate).
- **Border:** 1px Mist Border; hover and selected states switch to the primary border.
- **Structure:** header, content and footer slots; content padding can collapse.

### Inputs / Fields
- **Style:** white fill (dark: Input Night), 1px Input Slate border, 8px radius.
- **Focus:** ring in the focus-ring role (50% bright primary). Error uses the danger roles.

### Navigation
Header v2: tinted top bar (theme header token) with a glass bar at 55% opacity. Side navigation (`app-side-nav`) in dashboards; underlined `app-tabs` for sections.

### Tables
Header in the table-header green with white text; 1px primary-tinted row borders; row hover and selection use the Mint Tint. Selectable fields use `app-table-input`.

### Modals, Drawers, Dropdowns
`app-modal` and `app-drawer` on CDK Overlay with the themed scrim; `app-dropdown-panel` for every menu and popover.

### Status Badge
Colored text with a 12% tint fill and 35% tint border of the status color (success, info, warning, danger, neutral).

## Do's and Don'ts

### Do:
- **Do** pick a role class (`text-content`, `bg-surface`, `border-line`, `text-on-primary`, `text-link`) and omit `dark:` variants.
- **Do** reach for an existing shared component before styling markup by hand.
- **Do** define new component colors as CSS variables in `src/styles.css` (light under `body`, dark under `.dark body`).
- **Do** give every new i18n key a real Spanish translation.
- **Do** keep primary-colored surfaces to action and selection; status colors for status only.

### Don't:
- **Don't** use Tailwind palette colors, hex or `rgb()` in templates or component stylesheets.
- **Don't** write `text-[var(--x)]` or inline `var()` in HTML.
- **Don't** hardcode a shared component's colors in its own scss.
- **Don't** bind `title`, `id` or `hidden` as plain attributes on a custom component; bracket-bind them.
- **Don't** add shadows at rest to cards.
