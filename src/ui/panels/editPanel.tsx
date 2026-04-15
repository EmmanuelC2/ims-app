import { useEffect, useState } from 'react'
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
import { listAllCompartmentNames } from '../../database/inventory'

interface EditPanelProps {
    compartmentName: string
    itemName: string
    itemUrl: string | null
    itemImage: string | null
    itemQuantity: number
    onClose: () => void
    onUpdate: (updated: {
        originalCompartmentName: string
        originalItemName: string
        compartmentName: string
        itemName: string
        itemUrl: string
        itemImage: string | null
        itemQuantity: number
    }) => void
}

/**
 * Modal form for editing an existing inventory item. Fields are pre-filled
 * with the current values; the compartment is changed via a custom dropdown.
 */
export function EditPanel({
    compartmentName,
    itemName,
    itemUrl,
    itemImage,
    itemQuantity,
    onClose,
    onUpdate,
}: EditPanelProps) {
    const [selectedCompartment, setSelectedCompartment] = useState(compartmentName)
    const [editItemName, setEditItemName] = useState(itemName)
    const [editItemUrl, setEditItemUrl] = useState(itemUrl ?? '')
    const [editItemImage, setEditItemImage] = useState<string | null>(itemImage)
    const [editItemQuantity, setEditItemQuantity] = useState(String(itemQuantity))

    async function handlePickImage() {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (!permission.granted) return

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.8,
        })
        if (!result.canceled && result.assets[0]) {
            setEditItemImage(result.assets[0].uri)
        }
    }

    const [compartmentNames, setCompartmentNames] = useState<string[]>([])
    const [isDropdownOpen, setIsDropdownOpen] = useState(false)

    useEffect(() => {
        listAllCompartmentNames()
            .then(setCompartmentNames)
            .catch((err) => console.error('Failed to load compartments:', err))
    }, [])

    function handleUpdate() {
        const quantity = parseInt(editItemQuantity, 10)
        if (!editItemName.trim() || Number.isNaN(quantity)) return

        onUpdate({
            originalCompartmentName: compartmentName,
            originalItemName: itemName,
            compartmentName: selectedCompartment,
            itemName: editItemName.trim(),
            itemUrl: editItemUrl.trim(),
            itemImage: editItemImage,
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
                    <Text style={styles.title}>Edit Item</Text>

                    <View style={styles.field}>
                        <Text style={styles.label}>Compartment</Text>
                        <Pressable
                            style={styles.dropdownTrigger}
                            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <Text style={styles.dropdownTriggerText}>
                                {selectedCompartment}
                            </Text>
                            <Text style={styles.dropdownArrow}>
                                {isDropdownOpen ? '\u25B2' : '\u25BC'}
                            </Text>
                        </Pressable>

                        {isDropdownOpen && (
                            <View style={styles.dropdownList}>
                                <ScrollView nestedScrollEnabled style={styles.dropdownScroll}>
                                    {compartmentNames.map((name) => (
                                        <Pressable
                                            key={name}
                                            style={[
                                                styles.dropdownOption,
                                                name === selectedCompartment && styles.dropdownOptionActive,
                                            ]}
                                            onPress={() => {
                                                setSelectedCompartment(name)
                                                setIsDropdownOpen(false)
                                            }}
                                        >
                                            <Text
                                                style={[
                                                    styles.dropdownOptionText,
                                                    name === selectedCompartment && styles.dropdownOptionTextActive,
                                                ]}
                                            >
                                                {name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Item Name</Text>
                        <TextInput
                            style={styles.input}
                            value={editItemName}
                            onChangeText={setEditItemName}
                            placeholder={itemName}
                            autoComplete="off"
                            importantForAutofill="no"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Item Image (optional)</Text>
                        <View style={styles.imageRow}>
                            <Image
                                source={editItemImage ? { uri: editItemImage } : defaultItemIcon}
                                style={styles.imagePreview}
                            />
                            <Pressable style={styles.imagePickerButton} onPress={handlePickImage}>
                                <Text style={styles.imagePickerButtonText}>
                                    {editItemImage ? 'Change Image' : 'Pick Image'}
                                </Text>
                            </Pressable>
                            {editItemImage && (
                                <Pressable
                                    style={styles.imageClearButton}
                                    onPress={() => setEditItemImage(null)}
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
                            value={editItemUrl}
                            onChangeText={setEditItemUrl}
                            placeholder={itemUrl ?? 'https://...'}
                            autoCapitalize="none"
                            autoComplete="off"
                            keyboardType="url"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Quantity</Text>
                        <TextInput
                            style={styles.input}
                            value={editItemQuantity}
                            onChangeText={setEditItemQuantity}
                            placeholder={String(itemQuantity)}
                            autoComplete="off"
                            keyboardType="number-pad"
                        />
                    </View>

                    <View style={styles.footer}>
                        <Pressable style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                        <Button label="Update" onPress={handleUpdate} />
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
        zIndex: 1,
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
    dropdownTrigger: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d0d5dd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dropdownTriggerText: {
        fontSize: 14,
        color: '#2b2d42',
    },
    dropdownArrow: {
        fontSize: 10,
        color: '#8d99ae',
    },
    dropdownList: {
        marginTop: 4,
        borderWidth: 1,
        borderColor: '#d0d5dd',
        borderRadius: 8,
        backgroundColor: '#ffffff',
    },
    dropdownScroll: {
        maxHeight: 120,
    },
    dropdownOption: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    dropdownOptionActive: {
        backgroundColor: '#edf2f4',
    },
    dropdownOptionText: {
        fontSize: 14,
        color: '#2b2d42',
    },
    dropdownOptionTextActive: {
        fontWeight: '600',
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
