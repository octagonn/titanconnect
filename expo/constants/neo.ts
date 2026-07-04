import { INK } from './colors';

// Neo-brutalist border tokens. Same key vocabulary as the old glass.*
// recipes (raised/floating/primary/inset/chip/dock) so call sites just
// swap the import — spread directly into a View/Text/TextInput style for
// a flat ink-bordered surface. `inset` (recessed wells: text inputs) has
// no shadowOffset counterpart below — it should never pop off the page.
export const neoBorder = {
  raised: { borderWidth: 3, borderColor: INK },
  floating: { borderWidth: 3, borderColor: INK },
  primary: { borderWidth: 2.5, borderColor: INK },
  inset: { borderWidth: 2.5, borderColor: INK },
  chip: { borderWidth: 2, borderColor: INK },
  dock: { borderWidth: 3, borderColor: INK },
} as const;

// Offset (px) for the sibling hard-shadow block used by
// components/ui/HardShadow + NeoCard, keyed to match neoBorder. `inset`
// is intentionally absent — recessed elements never get a hard shadow.
export const shadowOffset = {
  raised: 8,
  floating: 8,
  primary: 6,
  chip: 6,
  dock: 8,
} as const;
