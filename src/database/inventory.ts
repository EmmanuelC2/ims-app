import { getDatabase } from './database'

/**
 * Single row returned from listCompartmentItems — the inventory panel only
 * needs the item name and its quantity in the compartment.
 */
export interface CompartmentItemRow {
    itemName: string
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
        `SELECT items.itemName AS itemName, ci.itemQuantity AS itemQuantity
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
