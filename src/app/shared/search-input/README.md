# app-search-input (`SearchInputComponent`)

Shared search box: a text input, a red clear button while there's text, and a
magnifier submit button. Replaces the copy-pasted box that `/search`, `/catalogues`
and `/search/catalogue/:id` each had.

```html
<app-search-input [control]="searchField" [placeholder]="'CATALOGS._search_placeholder' | translate"
  (search)="filterProviders()"></app-search-input>
```

| Input / Output | Meaning |
|---|---|
| `control` (required) | The `FormControl` the caller owns and reads. |
| `placeholder` | Already-translated placeholder text. |
| `ai` | AI search mode: purple border and a sparkles icon before the text. |
| `loading` | Shows a spinner instead of the magnifier. |
| `(search)` | Submit: Enter key or the magnifier. |

## Clearing is the caller's job

The clear button only calls `control.reset()`. What an emptied search means
(reload the list, drop the URL param, reset AI state...) differs per page, so each
caller subscribes to its own `control.valueChanges` and reacts to an empty value.
That also covers the user deleting the text by hand.

## Colors are CSS variables, not hardcoded

The box reuses the global form tokens (`--theme-input-bg`, `--theme-input-border`,
`--theme-default-text`, `--form-hint-text`) and the danger-button tokens
(`--button-danger-*`) for the clear button. The only tokens it owns are
`--search-input-ai-border` and `--search-input-ai-icon`, for AI mode. All of them
are defined in [src/styles.css](../../../styles.css) (`body` / `.dark body`);
`search-input.component.scss` only consumes them.

## Width

The host is full width on mobile and 443px from `sm` up, the size every call site
used. It's set in the component's `:host` style, which wins over a Tailwind
utility class on the tag, so a page that needs another width should constrain a
wrapper element instead.
