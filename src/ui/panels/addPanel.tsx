import { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    KeyboardAvoidingView,
    ScrollView,
    Image,
    Platform,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Button } from '../Button'
import { defaultItemIcon } from '../defaultItemIcon'

interface AddPanelProps {
    compartmentName: string
    onClose: () => void
    onSave: (item: {
        compartmentName: string
        itemName: string
        itemUrl: string
        itemImage: string | null
        itemQuantity: number
    }) => void
}

/**
 * Modal form for adding a new item to the currently open compartment.
 * Rendered on top of the InventoryPanel when the Add Item button is pressed.
 */
export function AddPanel({ compartmentName, onClose, onSave }: AddPanelProps) {
    const [itemName, setItemName] = useState('')
    const [itemUrl, setItemUrl] = useState('')
    const [itemImage, setItemImage] = useState<string | null>(null)
    const [itemQuantity, setItemQuantity] = useState('')

    async function handlePickImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) return

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        })
        if (!result.canceled && result.assets[0]) {
            setItemImage(result.assets[0].uri)
        }
    }

    function handleSave() {
        const quantity = parseInt(itemQuantity, 10)
        if(!itemName.trim() || Number.isNaN(quantity)) return

        onSave({
            compartmentName,
            itemName: itemName.trim(),
            itemUrl: itemUrl.trim(),
            itemImage,
            itemQuantity: quantity,
        })
    }

    return (
        <KeyboardAvoidingView
            style={styles.backdrop}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.panel}>
                <ScrollView keyboardShouldPersistTaps="handled">
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
                            autoComplete="off"
                            importantForAutofill="no"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Item Image (optional)</Text>
                        <View style={styles.imageRow}>
                            <Image
                                source={itemImage ? { uri: itemImage } : defaultItemIcon}
                                style={styles.imagePreview}
                            />
                            <Pressable style={styles.imagePickerButton} onPress={handlePickImage}>
                                <Text style={styles.imagePickerButtonText}>
                                    {itemImage ? 'Change Image' : 'Pick Image'}
                                </Text>
                            </Pressable>
                            {itemImage && (
                                <Pressable
                                    style={styles.imageClearButton}
                                    onPress={() => setItemImage(null)}
                                >
                                    <Text style={styles.imageClearButtonText}>Clear</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Item URL (optional)</Text>
                        <TextInput
                            style={styles.input}
                            value={itemUrl}
                            onChangeText={setItemUrl}
                            placeholder="https://..."
                            autoCapitalize="none"
                            autoComplete="off"
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
                            autoComplete="off"
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.footer}>
                        <Pressable style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                        <Button label="Save" onPress={handleSave} />
                    </View>
                </ScrollView>
            </View>
        </KeyboardAvoidingView>
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
    imageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    imagePreview: {
        width: 48,
        height: 48,
        borderRadius: 6,
        backgroundColor: '#f1f3f5',
    },
    imagePickerButton: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 6,
        backgroundColor: '#edf2f4',
        borderWidth: 1,
        borderColor: '#d0d5dd',
    },
    imagePickerButtonText: {
        color: '#2b2d42',
        fontWeight: '600',
        fontSize: 13,
    },
    imageClearButton: {
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    imageClearButtonText: {
        color: '#d90429',
        fontWeight: '600',
        fontSize: 13,
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
