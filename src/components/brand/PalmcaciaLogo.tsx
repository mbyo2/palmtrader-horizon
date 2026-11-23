import { MarkC } from "./palmcacia-marks";

/**
 * The standing Palmcacia logo (Variant C: ringed palm trunk, fronds flattening into an acacia umbrella
 * on a curved palm trunk). To swap the brand mark to Variant A or B,
 * change the import above to MarkA / MarkB from "./palmcacia-marks" —
 * this is the only file that chooses the variant.
 *
 * The mark inherits its colour from `color` (currentColor), so place it
 * on the Binance-yellow tile with a dark foreground, or use
 * `text-primary` on dark surfaces for the yellow mark.
 */
interface PalmcaciaLogoProps {
  className?: string;
}

const PalmcaciaLogo = ({ className }: PalmcaciaLogoProps) => (
  <MarkC className={className} />
);

export default PalmcaciaLogo;
