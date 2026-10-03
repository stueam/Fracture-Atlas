# Aetherheart website palette

Based on the supplied `论文图表配色规范.pdf`, v1.0.1 (2026-09-21).

The source palette is brand black `#1A1A1A`, terracotta `#B6572F`, warm brown
`#AC927E`, warm gray `#C8C1B6`, and light warm gray `#EAE5E2`. Body text uses
brand black, secondary text `#666666`, and grids light warm gray. Light chart
panels use white; the promotional page canvas uses a warm off-white.

The PDF's product names and Attune/Teacher mappings are not labels for this
study's models or methods. The website uses the following stable, site-specific
mapping with redundant shapes and explicit labels:

| Series / method        | Light color     | Shape           |
| ---------------------- | --------------- | --------------- |
| Target baseline        | Gray outline    | Hollow circle   |
| Best tested adaptation | Terracotta      | Diamond         |
| Kimi K3                | Light warm gray | Outlined square |
| DS v4 Pro              | Brand black     | Filled circle   |
| ICL                    | Warm brown      | Circle          |
| SkillOpt               | Warm gray       | Square          |
| SFT                    | Terracotta      | Diamond         |
| RL                     | Brand black     | Triangle        |
| TTT                    | Light warm gray | Cross           |

The same method symbols appear in tables, legends, and the cost scatter plot.
Light marks have visible outlines. The overview encodes baseline/adaptation
roles for one selected target model, rather than simultaneously coloring all
target models. Source-data palette metadata remains unchanged.

Dark mode is a website adaptation, not a palette specified by the PDF: warm
charcoal surfaces, lighter terracotta and brown, light neutral text. Small accent
text uses a darker terracotta in light mode for contrast. Exact source colors
remain in chart marks and the favicon. Decorative gradients and motion are
confined to the promotional hero, outside chart panels. The supplied paper PDF
and experimental data are unchanged.

Theme tokens live in `src/theme.css`; shared method symbols in
`src/components/MethodSymbol.tsx`. Keep new views on these shared mappings.
