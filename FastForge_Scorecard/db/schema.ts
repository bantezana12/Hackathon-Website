import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const ballots = sqliteTable('ballots', {
  judgeId: text('judge_id').notNull(),
  team: integer('team').notNull(),
  judgeName: text('judge_name').notNull(),
  ratings: text('ratings').notNull(),
  total: integer('total').notNull(),
  roundId: text('round_id').notNull().default('initial'),
  scoringVersion: integer('scoring_version').notNull().default(1),
  wentWell: text('went_well').notNull().default(''),
  couldImprove: text('could_improve').notNull().default(''),
  updatedAt: text('updated_at').notNull(),
}, table => [primaryKey({columns:[table.judgeId,table.team]})]);

export const judgeReviews = sqliteTable('judge_reviews', {
  judgeId: text('judge_id').notNull(),
  roundId: text('round_id').notNull(),
  scoreSnapshot: text('score_snapshot').notNull(),
  confirmedAt: text('confirmed_at').notNull(),
}, table => [primaryKey({columns:[table.judgeId,table.roundId]})]);
