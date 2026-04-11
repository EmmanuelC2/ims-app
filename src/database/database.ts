import * as SQLite from 'expo-sqlite'

/**
 * Name of the on-device SQLite database file.
 */
const DATABASE_NAME = 'ims.db'

/**
 * Schema (second normal form):
 *
 * compartments
 *   compartmentId   INTEGER PRIMARY KEY
 *   compartmentName TEXT
 *
 * items
 *   itemId   INTEGER PRIMARY KEY
 *   itemName TEXT
 *   itemUrl  TEXT
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
    itemId   INTEGER PRIMARY KEY AUTOINCREMENT,
    itemName TEXT NOT NULL UNIQUE,
    itemUrl  TEXT
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
 * Open the database (if not already open) and ensure all tables exist.
 * Safe to call multiple times — subsequent calls return the cached instance.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
    if (databaseInstance) return databaseInstance

    const db = await SQLite.openDatabaseAsync(DATABASE_NAME)
    await db.execAsync(SCHEMA_SQL)

    databaseInstance = db
    return db
}
