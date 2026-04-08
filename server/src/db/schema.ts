import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const printer = sqliteTable('printer', {
  serial: text('serial').primaryKey(),
  name: text('name').notNull(),
  hostIp: text('host_ip').notNull(),
  accessCode: text('access_code').notNull(),
});
export type Printer = typeof printer.$inferSelect;

export const schema = { printer };
export type Database = BetterSQLite3Database<typeof schema>;
