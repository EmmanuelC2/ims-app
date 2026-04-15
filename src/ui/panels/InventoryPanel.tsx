import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Animated, FlatList, Image } from 'react-native'
import { Button } from '../Button'
import { defaultItemIcon } from '../defaultItemIcon'
import { AddPanel } from './addPanel'
import { EditPanel } from './editPanel'
import {
    CompartmentItemRow,
    listCompartmentItems,
    removeCompartmentItem,
    saveInventoryItem,
    updateInventoryItem,
} from '../../database/inventory'

interface InventoryPanelProps {
    compartmentName: string
    onClose: () => void
}

/**
 * Full-screen overlay showing the contents of the tapped compartment. The
 * panel scales and fades in from the screen center — where the camera has
 * just zoomed — so it appears to emerge from the compartment itself.
 */
export function InventoryPanel({ compartmentName, onClose }: InventoryPanelProps) {
    //Near-zero so the panel visibly grows out of the compartment on mount.
    const scale = useRef(new Animated.Value(0.05)).current
    const opacity = useRef(new Animated.Value(0)).current

    const [isAddPanelOpen, setIsAddPanelOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<CompartmentItemRow | null>(null)
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
                                <Pressable
                                    style={styles.itemRow}
                                    onPress={() => setEditingItem(item)}
                                >
                                    <View style={styles.itemLeft}>
                                        <Image
                                            source={item.itemImage ? { uri: item.itemImage } : defaultItemIcon}
                                            style={styles.itemImage}
                                        />
                                        <Text style={styles.itemName}>{item.itemName}</Text>
                                    </View>
                                    <View style={styles.itemActions}>
                                        <Text style={styles.itemQuantity}>
                                            x{item.itemQuantity}
                                        </Text>
                                        <Button label="DEL" variant="danger" compact onPress={async () => {
                                            try {
                                                await removeCompartmentItem(compartmentName, item.itemName)
                                                await refreshItems()
                                            } catch (error) {
                                                console.error('Failed to remove item:', error)
                                            }
                                        }} />
                                    </View>
                                </Pressable>
                            )}
                        />
                    )}
                </View>

                <View style={styles.footer}>
                    <Button label="Add Item" variant="success" onPress={() => setIsAddPanelOpen(true)} />
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

            {editingItem && (
                <EditPanel
                    compartmentName={compartmentName}
                    itemName={editingItem.itemName}
                    itemUrl={editingItem.itemUrl}
                    itemImage={editingItem.itemImage}
                    itemQuantity={editingItem.itemQuantity}
                    onClose={() => setEditingItem(null)}
                    onUpdate={async (updated) => {
                        try {
                            await updateInventoryItem(updated)
                            await refreshItems()
                        } catch (error) {
                            console.error('Failed to update item:', error)
                        }
                        setEditingItem(null)
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
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    itemImage: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: '#f1f3f5',
    },
    itemName: {
        fontSize: 15,
        color: '#2b2d42',
        fontWeight: '500',
        flexShrink: 1,
    },
    itemActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
