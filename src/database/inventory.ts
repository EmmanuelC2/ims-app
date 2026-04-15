import { getDatabase } from './database'

/**
 * Row shape returned by listCompartmentItems, shaped for the inventory panel.
 */
export interface CompartmentItemRow {
    itemName: string
    itemUrl: string | null
    itemImage: string | null
    itemQuantity: number
}

/**
 * Fetches every item stored in the given compartment. Returns an empty array
 * if the compartment does not exist or holds no items.
 */
export async function listCompartmentItems(
    compartmentName: string,
): Promise<CompartmentItemRow[]> {
    const db = await getDatabase()
    return db.getAllAsync<CompartmentItemRow>(
        `SELECT items.itemName AS itemName, items.itemUrl AS itemUrl, items.itemImage AS itemImage, ci.itemQuantity AS itemQuantity
         FROM compartment_items ci
         JOIN compartments ON compartments.compartmentId = ci.compartmentId
         JOIN items        ON items.itemId               = ci.itemId
         WHERE compartments.compartmentName = ?
         ORDER BY items.itemName ASC`,
        compartmentName,
    )
}

/**
 * Removes an item from a compartment by deleting its junction row. The
 * underlying item and compartment rows are kept so they remain reusable.
 */
export async function removeCompartmentItem(
    compartmentName: string,
    itemName: string,
): Promise<void> {
    const db = await getDatabase()
    await db.runAsync(
        `DELETE FROM compartment_items
         WHERE compartmentId = (SELECT compartmentId FROM compartments WHERE compartmentName = ?)
           AND itemId        = (SELECT itemId        FROM items        WHERE itemName        = ?)`,
        compartmentName,
        itemName,
    )
}

/**
 * Returns every compartment name in alphabetical order. Used by the edit
 * panel's compartment dropdown.
 */
export async function listAllCompartmentNames(): Promise<string[]> {
    const db = await getDatabase()
    const rows = await db.getAllAsync<{ compartmentName: string }>(
        'SELECT compartmentName FROM compartments ORDER BY compartmentName ASC',
    )
    return rows.map((r) => r.compartmentName)
}

/**
 * Updates an existing inventory entry, identified by its original compartment
 * and item name. Handles changes to name, URL, image, quantity, and moves
 * between compartments.
 */
export async function updateInventoryItem(params: {
    originalCompartmentName: string
    originalItemName: string
    compartmentName: string
    itemName: string
    itemUrl: string
    itemImage: string | null
    itemQuantity: number
}): Promise<void> {
    const db = await getDatabase()

    await db.withTransactionAsync(async () => {
        const origCompartment = await db.getFirstAsync<{ compartmentId: number }>(
            'SELECT compartmentId FROM compartments WHERE compartmentName = ?',
            params.originalCompartmentName,
        )
        const origItem = await db.getFirstAsync<{ itemId: number }>(
            'SELECT itemId FROM items WHERE itemName = ?',
            params.originalItemName,
        )
        if (!origCompartment || !origItem) return

        await db.runAsync(
            'UPDATE items SET itemName = ?, itemUrl = ?, itemImage = ? WHERE itemId = ?',
            params.itemName,
            params.itemUrl || null,
            params.itemImage,
            origItem.itemId,
        )

        //Upsert in case the user moved the item into a brand-new compartment.
        await db.runAsync(
            'INSERT OR IGNORE INTO compartments (compartmentName) VALUES (?)',
            params.compartmentName,
        )
        const newCompartment = await db.getFirstAsync<{ compartmentId: number }>(
            'SELECT compartmentId FROM compartments WHERE compartmentName = ?',
            params.compartmentName,
        )
        if (!newCompartment) return

        if (origCompartment.compartmentId !== newCompartment.compartmentId) {
            await db.runAsync(
                'DELETE FROM compartment_items WHERE compartmentId = ? AND itemId = ?',
                origCompartment.compartmentId,
                origItem.itemId,
            )
            await db.runAsync(
                `INSERT INTO compartment_items (compartmentId, itemId, itemQuantity)
                 VALUES (?, ?, ?)
                 ON CONFLICT(compartmentId, itemId)
                 DO UPDATE SET itemQuantity = excluded.itemQuantity`,
                newCompartment.compartmentId,
                origItem.itemId,
                params.itemQuantity,
            )
        } else {
            await db.runAsync(
                'UPDATE compartment_items SET itemQuantity = ? WHERE compartmentId = ? AND itemId = ?',
                params.itemQuantity,
                origCompartment.compartmentId,
                origItem.itemId,
            )
        }
    })
}

/**
 * Inserts an item into a compartment, creating the compartment and item rows
 * if they do not exist yet. Quantity defaults to 1. A prior junction row for
 * the same (compartment, item) has its quantity overwritten.
 */
export async function saveInventoryItem(params: {
    compartmentName: string
    itemName: string
    itemUrl?: string
    itemImage?: string | null
    itemQuantity?: number
}): Promise<void> {
    const db = await getDatabase()
    const quantity = params.itemQuantity ?? 1

    await db.withTransactionAsync(async () => {
        await db.runAsync(
            'INSERT OR IGNORE INTO compartments (compartmentName) VALUES (?)',
            params.compartmentName,
        )
        const compartment = await db.getFirstAsync<{ compartmentId: number }>(
            'SELECT compartmentId FROM compartments WHERE compartmentName = ?',
            params.compartmentName,
        )

        await db.runAsync(
            'INSERT OR IGNORE INTO items (itemName, itemUrl, itemImage) VALUES (?, ?, ?)',
            params.itemName,
            params.itemUrl ?? null,
            params.itemImage ?? null,
        )
        const item = await db.getFirstAsync<{ itemId: number }>(
            'SELECT itemId FROM items WHERE itemName = ?',
            params.itemName,
        )

        if (!compartment || !item) return

        await db.runAsync(
            `INSERT INTO compartment_items (compartmentId, itemId, itemQuantity)
             VALUES (?, ?, ?)
             ON CONFLICT(compartmentId, itemId)
             DO UPDATE SET itemQuantity = excluded.itemQuantity`,
            compartment.compartmentId,
            item.itemId,
            quantity,
        )
    })
}
