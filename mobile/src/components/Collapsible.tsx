import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { RADIUS, SPACING } from '../theme/tokens';

/**
 * A section that starts closed. The content stays mounted while closed (only hidden), so cards inside keep
 * their state and loaded data when the section is opened and closed.
 */
export function Collapsible({ title, subtitle, children, startOpen = false }: { title: string; subtitle?: string; children: React.ReactNode; startOpen?: boolean }) {
  const { tokens: t } = useTheme();
  const [open, setOpen] = useState(startOpen);
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View style={{ marginVertical: 4 }}>
      <TouchableOpacity activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`${open ? 'Hide' : 'Show'} ${title}`} accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 52, paddingHorizontal: SPACING.cardPadding, borderRadius: RADIUS.card, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.textPrimary, fontSize: 15, lineHeight: 20, fontWeight: '600' }}>{title}</Text>
          {subtitle ? <Text numberOfLines={1} style={{ color: t.textSecondary, fontSize: 12, lineHeight: 16 }}>{subtitle}</Text> : null}
        </View>
        <Icon size={18} color={t.textSecondary} />
      </TouchableOpacity>
      <View style={open ? { marginTop: 4 } : { display: 'none' }}>{children}</View>
    </View>
  );
}
