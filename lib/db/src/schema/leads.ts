import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  alternateNumber: text("alternate_number"),
  address: text("address"),
  city: text("city"),
  email: text("email"),
  leadSource: text("lead_source"),
  stage: text("stage").notNull().default("lead"),
  assignedSalesPersonId: integer("assigned_sales_person_id").references(() => usersTable.id),
  remarks: text("remarks"),
  followUpDate: text("follow_up_date"),
  followUpStatus: text("follow_up_status").notNull().default("pending"),
  convertedProjectId: integer("converted_project_id"),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  projectCode: text("project_code"),
  stageUpdatedAt: timestamp("stage_updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  stageUpdatedAt: true,
  convertedProjectId: true,
  convertedAt: true,
  projectCode: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
