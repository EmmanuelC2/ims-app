import * as SQLite from 'expo-sqlite'

const DATABASE_NAME = 'ims.db'

/**
 * Schema (second normal form):
 *
 * compartments
 *   compartmentId   INTEGER PRIMARY KEY
 *   compartmentName TEXT
 *
 * items
 *   itemId    INTEGER PRIMARY KEY
 *   itemName  TEXT
 *   itemUrl   TEXT
 *   itemImage TEXT   (local file URI from image picker; null = use default)
 *
 * compartment_items (junction table with composite PK)
 *   compartmentId  INTEGER  (FK -> compartments.compartmentId)
 *   itemId         INTEGER  (FK -> items.itemId)
 *   itemQuantity   INTEGER
 *   PRIMARY KEY (compartmentId, itemId)
 */
const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS compartments (
    compartmentId   INTEGER PRIMARY KEY AUTOINCREMENT,
    compartmentName TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS items (
    itemId    INTEGER PRIMARY KEY AUTOINCREMENT,
    itemName  TEXT NOT NULL UNIQUE,
    itemUrl   TEXT,
    itemImage TEXT
);

CREATE TABLE IF NOT EXISTS compartment_items (
    compartmentId INTEGER NOT NULL,
    itemId        INTEGER NOT NULL,
    itemQuantity  INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (compartmentId, itemId),
    FOREIGN KEY (compartmentId) REFERENCES compartments(compartmentId) ON DELETE CASCADE,
    FOREIGN KEY (itemId)        REFERENCES items(itemId)        ON DELETE CASCADE
);
`

let databaseInstance: SQLite.SQLiteDatabase | null = null

/**
 * Opens the database (if not already open) and ensures the schema is up to
 * date. Subsequent calls return the cached instance.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (databaseInstance) return databaseInstance

    const db = await SQLite.openDatabaseAsync(DATABASE_NAME)
    await db.execAsync(SCHEMA_SQL)

    //Backfill itemImage on databases created before the column existed;
    //CREATE TABLE IF NOT EXISTS does not alter pre-existing tables.
    const columns = await db.getAllAsync<{ name: string }>(
        'PRAGMA table_info(items)',
    )
    if (!columns.some((c) => c.name === 'itemImage')) {
        await db.execAsync('ALTER TABLE items ADD COLUMN itemImage TEXT')
    }

    databaseInstance = db
    return db
}
