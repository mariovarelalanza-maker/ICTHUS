ALTER TABLE `movements` ADD `accountingYear` integer DEFAULT 2026 NOT NULL;
--> statement-breakpoint
UPDATE movements SET accountingYear = CAST(substr(date,1,4) AS INTEGER) WHERE date <> '';
