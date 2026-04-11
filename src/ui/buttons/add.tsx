import { Pressable, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native'

interface AddButtonProps {
    onPress: () => void
    label?: string
    style?: StyleProp<ViewStyle>
}

/**
 * Reusable "Add" button used on the InventoryPanel to add new items
 * to a compartment's inventory.
 */
export function AddButton({ onPress, label = 'Add Item', style }: AddButtonProps) {
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
        backgroundColor: '#2b9348',
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
