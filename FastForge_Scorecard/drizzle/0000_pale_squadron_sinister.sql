CREATE TABLE `ballots` (
	`judge_id` text NOT NULL,
	`team` integer NOT NULL,
	`judge_name` text NOT NULL,
	`ratings` text NOT NULL,
	`total` integer NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`judge_id`, `team`)
);
