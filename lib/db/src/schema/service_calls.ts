import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const serviceCallsTable = pgTable("service_calls", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projectsTable.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  address: text("address"),
  issueDescription: text("issue_description").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("medium"),
  assignedEngineerId: integer("assigned_engineer_id").references(() => usersTable.id),
  closureNotes: text("closure_notes"),
  scheduledDate: text("scheduled_date"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertServiceCallSchema = createInsertSchema(serviceCallsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertServiceCall = z.infer<typeof insertServiceCallSchema>;
export type ServiceCall = typeof serviceCallsTable.$inferSelect;
