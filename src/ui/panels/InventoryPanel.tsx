import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, FlatList } from 'react-native'
import { AddButton } from '../buttons/add'
import { AddPanel } from './addPanel'
import {
    CompartmentItemRow,
    listCompartmentItems,
    saveInventoryItem,
} from '../../database/inventory'

interface InventoryPanelProps {
    compartmentName: string
    onClose: () => void
}

/**
 * Full-screen overlay with a centered 90% panel that shows the contents of
 * the tapped compartment. Rendered above the GLView + gesture layer.
 *
 * On mount, the panel scales and fades in from a point (the center of the
 * screen — which is where the camera has just zoomed the compartment to),
 * giving the illusion that the panel is emerging from the compartment.
 */
export function InventoryPanel({ compartmentName, onClose }: InventoryPanelProps) {
    //Scale starts near-zero so the panel appears to grow out of the compartment.
    const scale = useRef(new Animated.Value(0.05)).current
    //Opacity of both the panel itself and the darkening backdrop.
    const opacity = useRef(new Animated.Value(0)).current

    //Whether the AddPanel form is currently overlaid on top of this panel.
    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)

    //Items that live in this compartment, loaded from SQLite.
    const [items, setItems] = useState<CompartmentItemRow[]>([])

    const refreshItems = useCallback(async () => {
        try {
            const rows = await listCompartmentItems(compartmentName)
            setItems(rows)
        } catch (error) {
            console.error('Failed to load compartment items:', error)
        }
    }, [compartmentName])

    useEffect(() => {
        refreshItems()
    }, [refreshItems])

    useEffect(() => {
        Animated.parallel([
            Animated.spring(scale, {
                toValue: 1,
                friction: 7,
                tension: 50,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
        ]).start()
    }, [scale, opacity])

    return (
        <Animated.View style={[styles.backdrop, { opacity }]}>
            <Animated.View
                style={[
                    styles.panel,
                    {
                        opacity,
                        transform: [{ scale }],
                    },
                ]}
            >
                <Text style={styles.title}>{compartmentName}</Text>

                <View style={styles.body}>
                    {items.length === 0 ? (
                        <Text style={styles.placeholder}>
                            No items yet. Tap "Add Item" to create one.
                        </Text>
                    ) : (
                        <FlatList
                            data={items}
                            keyExtractor={(row) => row.itemName}
                            renderItem={({ item }) => (
                                <View style={styles.itemRow}>
                                    <Text style={styles.itemName}>{item.itemName}</Text>
                                    <Text style={styles.itemQuantity}>
                                        x{item.itemQuantity}
                                    </Text>
                                </View>
                            )}
                        />
                    )}
                </View>

                <View style={styles.footer}>
                    <AddButton onPress={() => setIsAddPanelOpen(true)} />
                    <Pressable style={styles.closeButton} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </Pressable>
                </View>
            </Animated.View>

            {isAddPanelOpen && (
                <AddPanel
                    compartmentName={compartmentName}
                    onClose={() => setIsAddPanelOpen(false)}
                    onSave={async (item) => {
                        try {
                            await saveInventoryItem(item)
                            await refreshItems()
                        } catch (error) {
                            console.error('Failed to save inventory item:', error)
                        }
                        setIsAddPanelOpen(false)
                    }}
                />
            )}
        </Animated.View>
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
        width: '90%',
        height: '90%',
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
    body: {
        flex: 1,
    },
    placeholder: {
        fontSize: 14,
        color: '#8d99ae',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#edf2f4',
    },
    itemName: {
        fontSize: 15,
        color: '#2b2d42',
        fontWeight: '500',
    },
    itemQuantity: {
        fontSize: 14,
        color: '#8d99ae',
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    closeButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        backgroundColor: '#2b2d42',
    },
    closeButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
})
