import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native'

interface RemoveButtonProps {
    onPress: () => void
    label?: string
    style?: StyleProp<ViewStyle>
}

/**
 * Compact red "DEL" button placed inline on list rows.
 */
export function RemoveButton({ onPress, label = 'DEL', style }: RemoveButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
                style,
            ]}
        >
            <Text style={styles.label}>{label}</Text>
        </Pressable>
    )
}

const styles = StyleSheet.create({
    button: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#d90429',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPressed: {
        opacity: 0.75,
    },
    label: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: 12,
    },
})
