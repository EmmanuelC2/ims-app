import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native'

interface SaveButtonProps {
    onPress: () => void
    label?: string
    style?: StyleProp<ViewStyle>
}

/**
 * Reusable "Save" button used on forms (e.g. AddPanel) to commit data.
 */
export function SaveButton({ onPress, label = 'Save', style }: SaveButtonProps) {
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
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#1d4ed8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPressed: {
        opacity: 0.75,
    },
    label: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
})
