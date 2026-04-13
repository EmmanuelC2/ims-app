import { getDatabase } from './database'

/**
 * Single row returned from listCompartmentItems — the inventory panel only
 * needs the item name and its quantity in the compartment.
 */
export interface CompartmentItemRow {
    itemName: string
    itemUrl: string | null
    itemQuantity: number
}

/**
 * Fetch all items stored in the given compartment (by compartmentName).
 * Returns an empty array if the compartment has no rows or does not exist.
 */
export async function listCompartmentItems(
    compartmentName: string,
): Promise<CompartmentItemRow[]> {
    const db = await getDatabase()
    return db.getAllAsync<CompartmentItemRow>(
        `SELECT items.itemName AS itemName, items.itemUrl AS itemUrl, ci.itemQuantity AS itemQuantity
         FROM compartment_items ci
         JOIN compartments ON compartments.compartmentId = ci.compartmentId
         JOIN items        ON items.itemId               = ci.itemId
         WHERE compartments.compartmentName = ?
         ORDER BY items.itemName ASC`,
        compartmentName,
    )
}

/**
 * Upsert a compartment + item pair and record the quantity in the junction
 * table. Uses INSERT OR IGNORE on the two parent tables (which have UNIQUE
 * constraints on compartmentName / itemName) so duplicate names reuse the
 * existing row instead of failing.
 *
 * If an entry for the same (compartmentId, itemId) already exists in
 * compartment_items, its quantity is overwritten.
 *
 * Quantity defaults to 1 when not provided.
 */
/**
 * Remove an item from a compartment by deleting the junction row in
 * compartment_items. The item and compartment rows themselves are kept
 * so they can be reused.
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
 * Return every compartment name in the database, sorted alphabetically.
 * Used by the edit panel's compartment dropdown.
 */
export async function listAllCompartmentNames(): Promise<string[]> {
    const db = await getDatabase()
    const rows = await db.getAllAsync<{ compartmentName: string }>(
        'SELECT compartmentName FROM compartments ORDER BY compartmentName ASC',
    )
    return rows.map((r) => r.compartmentName)
}

/**
 * Update an existing inventory entry. Handles changes to the item's name,
 * URL, quantity, and even moving it to a different compartment.
 *
 * Identified by the original compartment + item name pair.
 */
export async function updateInventoryItem(params: {
    originalCompartmentName: string
    originalItemName: string
    compartmentName: string
    itemName: string
    itemUrl: string
    itemQuantity: number
}): Promise<void> {
    const db = await getDatabase()

    await db.withTransactionAsync(async () => {
        //Resolve original IDs
        const origCompartment = await db.getFirstAsync<{ compartmentId: number }>(
            'SELECT compartmentId FROM compartments WHERE compartmentName = ?',
            params.originalCompartmentName,
        )
        const origItem = await db.getFirstAsync<{ itemId: number }>(
            'SELECT itemId FROM items WHERE itemName = ?',
            params.originalItemName,
        )
        if (!origCompartment || !origItem) return

        //Update item fields (name, url)
        await db.runAsync(
            'UPDATE items SET itemName = ?, itemUrl = ? WHERE itemId = ?',
            params.itemName,
            params.itemUrl || null,
            origItem.itemId,
        )

        //Resolve new compartment (upsert in case it's brand-new)
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
            //Compartment changed — delete old junction row and insert new one
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
            //Same compartment — just update quantity
            await db.runAsync(
                'UPDATE compartment_items SET itemQuantity = ? WHERE compartmentId = ? AND itemId = ?',
                params.itemQuantity,
                origCompartment.compartmentId,
                origItem.itemId,
            )
        }
    })
}

export async function saveInventoryItem(params: {
    compartmentName: string
    itemName: string
    itemUrl?: string
    itemQuantity?: number
}): Promise<void> {
    const db = await getDatabase()
    const quantity = params.itemQuantity ?? 1

    await db.withTransactionAsync(async () => {
        //Upsert compartment — no-op if the compartmentName already exists.
        await db.runAsync(
            'INSERT OR IGNORE INTO compartments (compartmentName) VALUES (?)',
            params.compartmentName,
        )
        const compartment = await db.getFirstAsync<{ compartmentId: number }>(
            'SELECT compartmentId FROM compartments WHERE compartmentName = ?',
            params.compartmentName,
        )

        //Upsert item — no-op if the itemName already exists.
        await db.runAsync(
            'INSERT OR IGNORE INTO items (itemName, itemUrl) VALUES (?, ?)',
            params.itemName,
            params.itemUrl ?? null,
        )
        const item = await db.getFirstAsync<{ itemId: number }>(
            'SELECT itemId FROM items WHERE itemName = ?',
            params.itemName,
        )

        if(!compartment || !item) return

        //Upsert the junction row with the quantity.
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
