import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const movements=sqliteTable('movements',{id:text('id').primaryKey(),date:text('date').notNull(),detail:text('detail').notNull(),income:integer('income').notNull(),expense:integer('expense').notNull(),notes:text('notes').notNull(),category:text('category').notNull(),sourceRow:integer('sourceRow'),accountingYear:integer('accountingYear').notNull().default(2026),updatedAt:text('updatedAt'),deleted:integer('deleted').notNull().default(0)});
export const files=sqliteTable('files',{id:text('id').primaryKey(),movement:text('movement').notNull(),name:text('name').notNull(),type:text('type').notNull()});
export const settings=sqliteTable('settings',{id:text('id').primaryKey(),value:text('value').notNull()});
export const changes=sqliteTable('changes',{id:text('id').primaryKey(),movement:text('movement'),action:text('action').notNull(),detail:text('detail').notNull(),at:text('at').notNull(),actor:text('actor').notNull()});
