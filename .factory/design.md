# Private Call Captions — visual thesis

## Direction: paper-cut diorama

This is a companion that sits beside a deeply personal conversation. The interface is a quiet **paper-cut diorama**: visible layers make the privacy boundary legible—sound enters one layer, becomes readable words in another, and never travels beyond the device. It avoids the glossy "AI meeting assistant" look deliberately.

### Palette

| Token | Value | Purpose |
| --- | --- | --- |
| `ink` | `#18232F` | primary text, night surface |
| `paper` | `#FFF9EC` | warm primary background |
| `paper-deep` | `#F1E5CC` | recessed paper layers |
| `moss` | `#245C4F` | safe/local status and primary actions |
| `clay` | `#B9472C` | consent and caution callouts |
| `sky` | `#D9E7EA` | selected/layered audio surfaces |
| `mist` | `#65717C` | secondary text |

Ink on paper and paper on ink exceed 7:1. Moss on paper and clay on paper are used only at contrast-safe dark values.

### Type and spacing

The product uses self-hostable system fallbacks: `ui-rounded, Avenir Next, Nunito, system-ui` for headings (friendly but firm) and `ui-monospace, SFMono-Regular, Consolas` for captions and timestamps (stable, transcript-like). The 4/8px rhythm uses 8, 12, 16, 24, 32, 48 and 72px intervals. Caption text is intentionally 28–42px with generous line-height.

### Interaction and motion

Cards are not generic rectangles: each has a paper edge, an offset shadow, and a thin ink rule only when it marks a distinct layer. The microphone state is a single readable sentence paired with a shape/icon—never color alone. Paper panels enter by 180ms vertical settling; captions update with a 140ms opacity transition. Under `prefers-reduced-motion: reduce`, all transforms and transitions are removed.

### Asset plan and provenance

`assets/src/paper-caption-diorama.webp` is an original, generated illustration used on the landing page. It depicts a paper-cut caption panel, microphone, sound contours, and lock—no people or claims of recording. Generated 2026-08-28 using the factory Azure image model (`factory-image`) with `/opt/fleet/lib/gen-image.sh` from this prompt: "paper cut diorama showing a small private caption window floating above gentle layered sound waves, an abstract microphone with a closed lock beneath it ... warm recycled paper ... ink navy, cream, burnt orange, moss green, muted sky blue ... no text, watermark, logos, brands, ears or faces." It is original product artwork; source PNG and prompt sidecar are retained. The site footer discloses the generated illustration.

No third-party imagery, icon packs, fonts, analytics, or CDNs are used.
