import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native'

type ButtonVariant = 'primary' | 'success' | 'danger'

const variantColors: Record<ButtonVariant, string> = {
    primary: '#1d4ed8',
    success: '#2b9348',
    danger:  '#d90429',
}

interface ButtonProps {
    onPress: () => void
    label: string
    variant?: ButtonVariant
    compact?: boolean
    style?: StyleProp<ViewStyle>
}

/**
 * Reusable button with variant-based coloring.
 *
 * Variants:
 * - primary (blue)  — default, used for Save / Update
 * - success (green) — used for Add Item
 * - danger  (red)   — used for DEL / destructive actions
 *
 * Set compact=true for smaller inline buttons (e.g. DEL on list rows).
 */
export function Button({
    onPress,
    label,
    variant = 'primary',
    compact = false,
    style,
}: ButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                compact && styles.compact,
                { backgroundColor: variantColors[variant] },
                pressed && styles.pressed,
                style,
            ]}
        >
            <Text style={[styles.label, compact && styles.labelCompact]}>
                {label}
            </Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compact: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    pressed: {
        opacity: 0.75,
    },
    label: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    labelCompact: {
        fontWeight: '700',
        fontSize: 12,
    },
})
