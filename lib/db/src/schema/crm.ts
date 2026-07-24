import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  alternateNumber: text("alternate_number"),
  address: text("address"),
  city: text("city"),
  email: text("email"),
  leadSource: text("lead_source"),
  stage: text("stage").notNull().default("new"),
  stageUpdatedAt: timestamp("stage_updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  assignedSalesPersonId: integer("assigned_sales_person_id").references(
    () => users.id,
    { onDelete: "set null" },
  ),
  remarks: text("remarks"),
  followUpDate: date("follow_up_date"),
  followUpStatus: text("follow_up_status").notNull().default("pending"),
  convertedProjectId: integer("converted_project_id"),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const leadNotes = pgTable("lead_notes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdById: integer("created_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  address: text("address"),
  city: text("city"),
  systemCapacityKw: numeric("system_capacity_kw", { precision: 10, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 14, scale: 2 }),
  stage: text("stage").notNull().default("new"),
  assignedEngineerId: integer("assigned_engineer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  remarks: text("remarks"),
  stageUpdatedAt: timestamp("stage_updated_at", { withTimezone: true }),
  pmsgyRegistrationNo: text("pmsgy_registration_no"),
  pmsgyRegistrationDate: date("pmsgy_registration_date"),
  discomChangeRefNo: text("discom_change_ref_no"),
  discomChangeDate: date("discom_change_date"),
  netMeteringRefNo: text("net_metering_ref_no"),
  netMeteringDate: date("net_metering_date"),
  meterSerialNo: text("meter_serial_no"),
  subsidySubmissionRefNo: text("subsidy_submission_ref_no"),
  subsidySubmissionDate: date("subsidy_submission_date"),
  documentHandoverDate: date("document_handover_date"),
  customerAcknowledgement: text("customer_acknowledgement"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  paymentDate: date("payment_date"),
  paymentMode: text("payment_mode"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  collectedById: integer("collected_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  sku: text("sku").unique(),
  unit: text("unit").notNull(),
  currentStock: numeric("current_stock", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  minStockLevel: numeric("min_stock_level", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  maxStockLevel: numeric("max_stock_level", { precision: 14, scale: 2 }),
  unitCost: numeric("unit_cost", { precision: 14, scale: 2 }),
  supplierName: text("supplier_name"),
  location: text("location"),
  isLowStock: boolean("is_low_stock").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inventoryTransactions = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  quantity: numeric("quantity", { precision: 14, scale: 2 }).notNull(),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  performedById: integer("performed_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceCalls = pgTable("service_calls", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  address: text("address"),
  issueDescription: text("issue_description").notNull(),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  assignedEngineerId: integer("assigned_engineer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  hsnCode: text("hsn_code"),
  closureNotes: text("closure_notes"),
  scheduledDate: date("scheduled_date"),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  performedById: integer("performed_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  documentType: text("document_type").notNull(),
  objectPath: text("object_path").notNull(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  uploadedById: integer("uploaded_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type LeadNote = typeof leadNotes.$inferSelect;
export type NewLeadNote = typeof leadNotes.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
export type InventoryTransaction = typeof inventoryTransactions.$inferSelect;
export type NewInventoryTransaction = typeof inventoryTransactions.$inferInsert;
export type ServiceCall = typeof serviceCalls.$inferSelect;
export type NewServiceCall = typeof serviceCalls.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;