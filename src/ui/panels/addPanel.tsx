import { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
} from 'react-native'
import { SaveButton } from '../buttons/save'

interface AddPanelProps {
    compartmentName: string
    onClose: () => void
    onSave: (item: {
        compartmentName: string
        itemName: string
        itemUrl: string
        itemQuantity: number
    }) => void
}

/**
 * Form panel for adding a new item to the currently open compartment.
 * Rendered on top of the InventoryPanel when the AddButton is pressed.
 */
export function AddPanel({ compartmentName, onClose, onSave }: AddPanelProps) {
    const [itemName, setItemName] = useState('')
    const [itemUrl, setItemUrl] = useState('')
    const [itemQuantity, setItemQuantity] = useState('')

    function handleSave() {
        const quantity = parseInt(itemQuantity, 10)
        if(!itemName.trim() || Number.isNaN(quantity)) return

        onSave({
            compartmentName,
            itemName: itemName.trim(),
            itemUrl: itemUrl.trim(),
            itemQuantity: quantity,
        })
    }

    return (
        <View style={styles.backdrop}>
            <View style={styles.panel}>
                <Text style={styles.title}>Add Item</Text>

                <View style={styles.field}>
                    <Text style={styles.label}>Compartment</Text>
                    <TextInput
                        style={[styles.input, styles.inputDisabled]}
                        value={compartmentName}
                        editable={false}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Item Name</Text>
                    <TextInput
                        style={styles.input}
                        value={itemName}
                        onChangeText={setItemName}
                        placeholder="e.g. Wrench"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Item URL (optional)</Text>
                    <TextInput
                        style={styles.input}
                        value={itemUrl}
                        onChangeText={setItemUrl}
                        placeholder="https://..."
                        autoCapitalize="none"
                        keyboardType="url"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Quantity</Text>
                    <TextInput
                        style={styles.input}
                        value={itemQuantity}
                        onChangeText={setItemQuantity}
                        placeholder="0"
                        keyboardType="number-pad"
                    />
                </View>

                <View style={styles.footer}>
                    <Pressable style={styles.cancelButton} onPress={onClose}>
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <SaveButton onPress={handleSave} />
                </View>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    panel: {
        width: '85%',
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 16,
        color: '#2b2d42',
    },
    field: {
        marginBottom: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#2b2d42',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#d0d5dd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: '#2b2d42',
    },
    inputDisabled: {
        backgroundColor: '#f1f3f5',
        color: '#6c757d',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    cancelButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#2b2d42',
    },
    cancelButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
})
