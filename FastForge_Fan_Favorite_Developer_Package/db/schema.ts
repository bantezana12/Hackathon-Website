import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const fanVotes = sqliteTable('fan_votes', {
  voterId: text('voter_id').primaryKey(),
  team: integer('team').notNull(),
  updatedAt: text('updated_at').notNull(),
});
