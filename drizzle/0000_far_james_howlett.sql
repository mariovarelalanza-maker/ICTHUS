CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`movement` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `movements` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`detail` text NOT NULL,
	`income` integer NOT NULL,
	`expense` integer NOT NULL,
	`notes` text NOT NULL,
	`category` text NOT NULL,
	`sourceRow` integer,
	`deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
