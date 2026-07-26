import { relations } from "drizzle-orm";
import {
  activities,
  documents,
  inventoryItems,
  inventoryTransactions,
  leadNotes,
  leads,
  payments,
  projects,
  serviceCalls,
} from "./crm";
import { users } from "./users";

export const usersRelations = relations(users, ({ many }) => ({
  assignedLeads: many(leads, { relationName: "salesperson_leads" }),
  assignedProjects: many(projects, { relationName: "engineer_projects" }),
  collectedPayments: many(payments, { relationName: "collector_payments" }),
  assignedServiceCalls: many(serviceCalls, { relationName: "engineer_service_calls" }),
  performedTransactions: many(inventoryTransactions, {
    relationName: "transaction_performer",
  }),
  performedActivities: many(activities, { relationName: "activity_performer" }),
  uploadedDocuments: many(documents, { relationName: "document_uploader" }),
  leadNotes: many(leadNotes, { relationName: "note_author" }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedSalesPerson: one(users, {
    fields: [leads.assignedSalesPersonId],
    references: [users.id],
    relationName: "salesperson_leads",
  }),
  project: one(projects, {
    fields: [leads.convertedProjectId],
    references: [projects.id],
    relationName: "converted_lead",
  }),
  notes: many(leadNotes),
  documents: many(documents),
}));

export const leadNotesRelations = relations(leadNotes, ({ one }) => ({
  lead: one(leads, {
    fields: [leadNotes.leadId],
    references: [leads.id],
  }),
  createdBy: one(users, {
    fields: [leadNotes.createdById],
    references: [users.id],
    relationName: "note_author",
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  lead: one(leads, {
    fields: [projects.leadId],
    references: [leads.id],
  }),
  assignedEngineer: one(users, {
    fields: [projects.assignedEngineerId],
    references: [users.id],
    relationName: "engineer_projects",
  }),
  payments: many(payments),
  inventoryTransactions: many(inventoryTransactions),
  serviceCalls: many(serviceCalls),
  documents: many(documents),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  project: one(projects, {
    fields: [payments.projectId],
    references: [projects.id],
  }),
  collectedBy: one(users, {
    fields: [payments.collectedById],
    references: [users.id],
    relationName: "collector_payments",
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  transactions: many(inventoryTransactions),
}));

export const inventoryTransactionsRelations = relations(
  inventoryTransactions,
  ({ one }) => ({
    item: one(inventoryItems, {
      fields: [inventoryTransactions.itemId],
      references: [inventoryItems.id],
    }),
    project: one(projects, {
      fields: [inventoryTransactions.projectId],
      references: [projects.id],
    }),
    performedBy: one(users, {
      fields: [inventoryTransactions.performedById],
      references: [users.id],
      relationName: "transaction_performer",
    }),
  }),
);

export const serviceCallsRelations = relations(serviceCalls, ({ one }) => ({
  project: one(projects, {
    fields: [serviceCalls.projectId],
    references: [projects.id],
  }),
  assignedEngineer: one(users, {
    fields: [serviceCalls.assignedEngineerId],
    references: [users.id],
    relationName: "engineer_service_calls",
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  performedBy: one(users, {
    fields: [activities.performedById],
    references: [users.id],
    relationName: "activity_performer",
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  lead: one(leads, {
    fields: [documents.leadId],
    references: [leads.id],
  }),
  project: one(projects, {
    fields: [documents.projectId],
    references: [projects.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
    relationName: "document_uploader",
  }),
}));