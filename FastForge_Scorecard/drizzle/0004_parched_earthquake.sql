CREATE TABLE `judge_reviews` (
	`judge_id` text NOT NULL,
	`round_id` text NOT NULL,
	`score_snapshot` text NOT NULL,
	`confirmed_at` text NOT NULL,
	PRIMARY KEY(`judge_id`, `round_id`)
);
