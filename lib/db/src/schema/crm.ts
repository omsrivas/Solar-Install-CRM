import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const leads = sqliteTable("leads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerName: text("customer_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  alternateNumber: text("alternate_number"),
  address: text("address"),
  city: text("city"),
  email: text("email"),
  leadSource: text("lead_source"),
  stage: text("stage").notNull().default("new"),
  stageUpdatedAt: integer("stage_updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  assignedSalesPersonId: integer("assigned_sales_person_id").references(
    () => users.id,
    { onDelete: "set null" },
  ),
  remarks: text("remarks"),
  // Stored as ISO date string YYYY-MM-DD
  followUpDate: text("follow_up_date"),
  followUpStatus: text("follow_up_status").notNull().default("pending"),
  convertedProjectId: integer("converted_project_id"),
  convertedAt: integer("converted_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const leadNotes = sqliteTable("lead_notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdById: integer("created_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  address: text("address"),
  city: text("city"),
  systemCapacityKw: real("system_capacity_kw"),
  totalAmount: real("total_amount"),
  stage: text("stage").notNull().default("new"),
  assignedEngineerId: integer("assigned_engineer_id").references(() => users.id, {
    onDelete: "set null",
  }),
  remarks: text("remarks"),
  stageUpdatedAt: integer("stage_updated_at", { mode: "timestamp" }),
  pmsgyRegistrationNo: text("pmsgy_registration_no"),
  pmsgyRegistrationDate: text("pmsgy_registration_date"),
  discomChangeRefNo: text("discom_change_ref_no"),
  discomChangeDate: text("discom_change_date"),
  netMeteringRefNo: text("net_metering_ref_no"),
  netMeteringDate: text("net_metering_date"),
  meterSerialNo: text("meter_serial_no"),
  subsidySubmissionRefNo: text("subsidy_submission_ref_no"),
  subsidySubmissionDate: text("subsidy_submission_date"),
  documentHandoverDate: text("document_handover_date"),
  customerAcknowledgement: text("customer_acknowledgement"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const payments = sqliteTable("payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  projectId: integer("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: real("amount").notNull(),
  status: text("status").notNull().default("pending"),
  paymentDate: text("payment_date"),
  paymentMode: text("payment_mode"),
  referenceNumber: text("reference_number"),
  notes: text("notes"),
  collectedById: integer("collected_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull(),
  sku: text("sku").unique(),
  unit: text("unit").notNull(),
  currentStock: real("current_stock").notNull().default(0),
  minStockLevel: real("min_stock_level").notNull().default(0),
  maxStockLevel: real("max_stock_level"),
  unitCost: real("unit_cost"),
  supplierName: text("supplier_name"),
  location: text("location"),
  isLowStock: integer("is_low_stock", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const inventoryTransactions = sqliteTable("inventory_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  itemId: integer("item_id")
    .notNull()
    .references(() => inventoryItems.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  quantity: real("quantity").notNull(),
  projectId: integer("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  performedById: integer("performed_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const serviceCalls = sqliteTable("service_calls", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  scheduledDate: text("scheduled_date"),
  closedAt: integer("closed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  performedById: integer("performed_by_id").references(() => users.id, {
    onDelete: "set null",
  }),
  // Stored as JSON text
  metadata: text("metadata", { mode: "json" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
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
