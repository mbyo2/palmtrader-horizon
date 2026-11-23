import { MarkA } from "./palmcacia-marks";

/**
 * The standing Palmcacia logo (Variant A: acacia umbrella + palm fronds
 * on a single forked trunk). To swap the brand mark to Variant B or C,
 * change the import above to MarkB / MarkC from "./palmcacia-marks" —
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
  <MarkA className={className} />
);

export default PalmcaciaLogo;
