import React from 'react';
import { View } from 'react-native';
import { Leaf } from 'lucide-react-native';

/** The Solvanta lime, the same colour as the leaf in assets/brand/solvanta-leaf.svg. */
export const BRAND_LIME = '#B3F23D';
const BADGE_FILL = '#0F130E';
const BADGE_RING = '#2A302A';

/**
 * The Solvanta leaf: the Lucide "leaf" icon, the same shape as assets/brand/solvanta-leaf.svg.
 * With `ring` it sits in the dark circular badge (see solvanta-leaf-badge.svg), `size` then being the badge diameter.
 */
export function SolvantaLogo({ size = 24, color = BRAND_LIME, ring = false, testID }: { size?: number; color?: string; ring?: boolean; testID?: string }) {
  if (!ring) return <Leaf testID={testID} size={size} color={color} />;
  // The leaf's drawn extent is 21 of the icon's 24 units, so this icon size makes the leaf about 60% of the diameter.
  const leaf = Math.round(((size * 0.6 * 24) / 21) * 100) / 100;
  return (
    <View testID={testID} accessible={false} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: BADGE_FILL, borderWidth: 1, borderColor: BADGE_RING }}>
      <Leaf size={leaf} color={color} />
    </View>
  );
}
