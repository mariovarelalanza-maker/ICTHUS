CREATE TABLE `changes` (
	`id` text PRIMARY KEY NOT NULL,
	`movement` text,
	`action` text NOT NULL,
	`detail` text NOT NULL,
	`at` text NOT NULL,
	`actor` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `movements` ADD `updatedAt` text;