// Price/change color convention.
//
// Western (default): gains green, losses red.
// Eastern (CN/JP/KR): gains RED, losses green — red = prosperity/gains there.
// This build targets a Western audience, who read inverted P&L as a mistake.
//
// IMPORTANT: this flag flips ONLY price/change colors. The order-book depth
// ladder is bids-green / asks-red in EVERY market (a buy/sell distinction, not
// up/down) and is NOT affected by this flag — see --bid/--ask in globals.css.

export type ColorConvention = "western" | "eastern"

export const COLOR_CONVENTION = "western" as ColorConvention

// RGB triplets for canvas/JS consumers that can't read the CSS vars.
const GREEN = "34, 197, 94"
const RED = "239, 68, 68"

export const GAIN_RGB = COLOR_CONVENTION === "eastern" ? RED : GREEN
export const LOSS_RGB = COLOR_CONVENTION === "eastern" ? GREEN : RED

// Class applied to <html> so CSS price tokens (--price-up/--price-down) flip.
export const CONVENTION_CLASS = `convention-${COLOR_CONVENTION}`
