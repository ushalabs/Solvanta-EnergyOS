import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';
import { EmbeddedCards } from './TwinControls';

/**
 * A card that starts closed. Its header row is the card's header: the content below it is drawn without a
 * second frame or title. The content stays mounted while closed (only hidden), so cards inside keep their
 * state and loaded data when the section is opened and closed.
 */
export function Collapsible({ title, subtitle, icon, children, startOpen = false }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode; startOpen?: boolean }) {
  const { tokens: t } = useTheme();
  const [open, setOpen] = useState(startOpen);
  const Chevron = open ? ChevronUp : ChevronDown;
  return (
    <View style={{ marginVertical: 4, borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, overflow: 'hidden' }}>
      <TouchableOpacity activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${open ? 'Hide' : 'Show'} ${title}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: SPACING.cardPadding, paddingVertical: 10 }}>
        {icon ? <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.limeTint }}>{icon}</View> : null}
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: 16, lineHeight: 21, fontWeight: '700' }}>{title}</Text>
          {subtitle ? <Text numberOfLines={open ? 2 : 1} style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>{subtitle}</Text> : null}
        </View>
        <Chevron size={18} color={t.textSecondary} />
      </TouchableOpacity>
      <View style={open ? { padding: SPACING.cardPadding, paddingTop: 0 } : { display: 'none' }}>
        <EmbeddedCards value={true}>{children}</EmbeddedCards>
      </View>
    </View>
  );
}
