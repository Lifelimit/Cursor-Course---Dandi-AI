# Dandi visual system

The shared visual language is dark, atmospheric, editorial, and technical. Use the tokens and primitives in `app/globals.css` before adding a new arbitrary color, shadow, or animation.

## Depth

- **Ambient** (`dandi-surface-ambient`): page atmosphere, grids, glow fields, and decorative backdrop elements. It has no card border.
- **Workspace** (`dandi-surface-workspace`): standard panels, tables, settings cards, and secondary sections. Use subtle borders and restrained glow.
- **Elevated** (`dandi-surface-elevated`): active builders, primary results, important modals, and selected workflows. Use the clearest edge and strongest justified lighting.
- **Solid** (`dandi-surface-solid`): dense technical surfaces such as code windows or modal content that need stable contrast.

## Color and intensity

Semantic accents are state-driven: emerald means interaction, ready, success, or active workflow; cyan means information, connection, or telemetry; violet means AI or transformation; amber means loading, stale, warning, or partial completion; rose means destructive, failed, or blocked.

Intensity classes (`dandi-intensity-subtle`, `standard`, `elevated`, `critical`) coordinate border and glow strength. Ordinary secondary surfaces should use no more than two strong treatments. Reserve elevated and critical lighting for meaningful hierarchy or status.

## Typography

Use `dandi-type-display` for major editorial headings, `dandi-type-interface` for navigation, controls, labels, and ordinary copy, `dandi-type-metadata` for compact telemetry and status labels, and `dandi-type-code` for paths, payloads, and snippets. Uppercase mono is specialized metadata, not the default for ordinary navigation.

## Motion

Use the shared duration and easing tokens. Prefer transform and opacity; do not animate layout properties or large page regions continuously. Ambient drift may loop quietly, processing/loading indicators may loop while active, and success/warning/error motion should stop after communicating state. `prefers-reduced-motion: reduce` removes decorative loops and shimmer, makes scrolling immediate, and keeps essential loading feedback calm and understandable.

## Examples

Use workspace depth for a history table or settings card. Promote an active request builder, primary result, or focused modal to elevated depth. Keep the ambient background behind both; do not combine an animated border, strong glow, dense pattern, blur, and gradient on every ordinary card.
