import { db, usersTable, leadsTable, projectsTable, paymentsTable, inventoryItemsTable, inventoryTransactionsTable, serviceCallsTable, activitiesTable, settingsTable } from "@workspace/db";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Seeding database...");

  // Settings
  const defaultSettings = [
    { key: "company_name", value: "SunPower Solar" },
    { key: "company_logo", value: "" },
    { key: "theme_primary_color", value: "38 92% 50%" },
    { key: "lead_sources", value: JSON.stringify(["Online Ad", "Referral", "Walk-In", "Social Media", "Cold Call", "Exhibition", "Other"]) },
    { key: "inventory_categories", value: JSON.stringify(["Solar Panel", "Inverter", "Battery", "Structure", "Cable", "Switch", "Meter", "Tools", "Other"]) },
    { key: "payment_methods", value: JSON.stringify(["Cash", "Bank Transfer", "Cheque", "UPI", "NEFT", "RTGS", "Card"]) },
  ];
  for (const s of defaultSettings) {
    await db.insert(settingsTable).values(s).onConflictDoNothing();
  }

  // Users
  const adminHash = await bcrypt.hash("admin123", 10);
  const salesHash = await bcrypt.hash("sales123", 10);
  const engineerHash = await bcrypt.hash("eng123", 10);
  const financeHash = await bcrypt.hash("fin123", 10);
  const warehouseHash = await bcrypt.hash("wh123", 10);

  const [admin] = await db.insert(usersTable).values({
    name: "Admin User",
    email: "admin@solarcrm.com",
    role: "admin",
    phone: "+91 98765 00001",
    passwordHash: adminHash,
    isActive: true,
  }).onConflictDoNothing().returning();

  const [sales1] = await db.insert(usersTable).values({
    name: "Ravi Sharma",
    email: "ravi@solarcrm.com",
    role: "sales",
    phone: "+91 98765 00002",
    passwordHash: salesHash,
    isActive: true,
  }).onConflictDoNothing().returning();

  const [eng1] = await db.insert(usersTable).values({
    name: "Priya Singh",
    email: "priya@solarcrm.com",
    role: "engineer",
    phone: "+91 98765 00003",
    passwordHash: engineerHash,
    isActive: true,
  }).onConflictDoNothing().returning();

  const [fin1] = await db.insert(usersTable).values({
    name: "Anita Verma",
    email: "anita@solarcrm.com",
    role: "finance",
    phone: "+91 98765 00004",
    passwordHash: financeHash,
    isActive: true,
  }).onConflictDoNothing().returning();

  const [wh1] = await db.insert(usersTable).values({
    name: "Suresh Kumar",
    email: "suresh@solarcrm.com",
    role: "warehouse",
    phone: "+91 98765 00005",
    passwordHash: warehouseHash,
    isActive: true,
  }).onConflictDoNothing().returning();

  const salesId = sales1?.id;
  const engId = eng1?.id;
  const adminId = admin?.id;

  // Leads (varied stages)
  const leadsData = [
    { customerName: "Rahul Gupta", mobileNumber: "9876543210", city: "Mumbai", leadSource: "Online Ad", stage: "lead", assignedSalesPersonId: salesId },
    { customerName: "Meena Patel", mobileNumber: "9876543211", city: "Pune", leadSource: "Referral", stage: "tele_calling", assignedSalesPersonId: salesId, followUpDate: new Date(Date.now() + 86400000).toISOString().split("T")[0] },
    { customerName: "Ajay Reddy", mobileNumber: "9876543212", city: "Hyderabad", leadSource: "Social Media", stage: "site_visit", assignedSalesPersonId: salesId },
    { customerName: "Sunita Joshi", mobileNumber: "9876543213", city: "Bangalore", leadSource: "Referral", stage: "quotation_sent", assignedSalesPersonId: salesId },
    { customerName: "Kiran Desai", mobileNumber: "9876543214", city: "Surat", leadSource: "Walk-In", stage: "negotiation", assignedSalesPersonId: salesId },
    { customerName: "Pooja Nair", mobileNumber: "9876543215", city: "Chennai", leadSource: "Exhibition", stage: "order_owned", assignedSalesPersonId: salesId },
    { customerName: "Vikram Shah", mobileNumber: "9876543216", city: "Ahmedabad", leadSource: "Cold Call", stage: "allocated", assignedSalesPersonId: salesId },
    { customerName: "Deepa Malhotra", mobileNumber: "9876543217", city: "Delhi", leadSource: "Online Ad", stage: "lead" },
  ];

  const insertedLeads: { id: number }[] = [];
  for (const l of leadsData) {
    const [lead] = await db.insert(leadsTable).values(l).returning({ id: leadsTable.id });
    insertedLeads.push(lead);
  }

  // Projects
  const projectsData = [
    { leadId: insertedLeads[5]?.id, customerName: "Pooja Nair", customerPhone: "9876543215", city: "Chennai", systemCapacityKw: "5.00", totalAmount: "350000.00", stage: "order_punched", assignedEngineerId: engId },
    { customerName: "Amit Kothari", customerPhone: "9898989898", city: "Jaipur", systemCapacityKw: "10.00", totalAmount: "650000.00", stage: "survey_done", assignedEngineerId: engId },
    { customerName: "Rekha Iyer", customerPhone: "9797979797", city: "Coimbatore", systemCapacityKw: "3.00", totalAmount: "220000.00", stage: "installation_done", assignedEngineerId: engId },
    { customerName: "Sunil Mehta", customerPhone: "9696969696", city: "Nagpur", systemCapacityKw: "7.50", totalAmount: "490000.00", stage: "handover_done", assignedEngineerId: engId },
    { customerName: "Geeta Sharma", customerPhone: "9595959595", city: "Bhopal", systemCapacityKw: "5.00", totalAmount: "320000.00", stage: "completed", assignedEngineerId: engId },
  ];

  const insertedProjects: { id: number }[] = [];
  for (const p of projectsData) {
    const [project] = await db.insert(projectsTable).values(p).returning({ id: projectsTable.id });
    insertedProjects.push(project);
  }

  // Payments
  if (insertedProjects.length > 0) {
    const paymentsData = [
      { projectId: insertedProjects[0].id, type: "advance", amount: "105000.00", status: "received", paymentDate: new Date().toISOString().split("T")[0], paymentMode: "UPI", referenceNumber: "UPI2024001" },
      { projectId: insertedProjects[1].id, type: "advance", amount: "195000.00", status: "received", paymentDate: new Date().toISOString().split("T")[0], paymentMode: "NEFT", referenceNumber: "NEFT2024001" },
      { projectId: insertedProjects[1].id, type: "milestone", amount: "200000.00", status: "pending", paymentDate: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0] },
      { projectId: insertedProjects[2].id, type: "advance", amount: "66000.00", status: "received", paymentDate: new Date().toISOString().split("T")[0], paymentMode: "Cash" },
      { projectId: insertedProjects[2].id, type: "final", amount: "154000.00", status: "received", paymentDate: new Date().toISOString().split("T")[0], paymentMode: "Bank Transfer" },
      { projectId: insertedProjects[3].id, type: "advance", amount: "147000.00", status: "received", paymentDate: new Date().toISOString().split("T")[0], paymentMode: "Cheque" },
      { projectId: insertedProjects[3].id, type: "final", amount: "343000.00", status: "overdue", paymentDate: new Date(Date.now() - 5 * 86400000).toISOString().split("T")[0] },
      { projectId: insertedProjects[4].id, type: "advance", amount: "96000.00", status: "received", paymentDate: new Date().toISOString().split("T")[0], paymentMode: "UPI" },
      { projectId: insertedProjects[4].id, type: "final", amount: "224000.00", status: "received", paymentDate: new Date().toISOString().split("T")[0], paymentMode: "NEFT" },
    ];
    for (const p of paymentsData) {
      await db.insert(paymentsTable).values(p);
    }
  }

  // Inventory
  const inventoryData = [
    { name: "Monocrystalline Solar Panel 540W", category: "Solar Panel", sku: "SP-MONO-540", unit: "pcs", currentStock: "45", minStockLevel: "20", maxStockLevel: "100", unitCost: "8500.00", supplierName: "SunTech India" },
    { name: "Polycrystalline Solar Panel 330W", category: "Solar Panel", sku: "SP-POLY-330", unit: "pcs", currentStock: "12", minStockLevel: "20", maxStockLevel: "80", unitCost: "5000.00", supplierName: "SunTech India" },
    { name: "String Inverter 5kW", category: "Inverter", sku: "INV-STR-5K", unit: "pcs", currentStock: "8", minStockLevel: "5", unitCost: "35000.00", supplierName: "Havells Solar" },
    { name: "Hybrid Inverter 10kW", category: "Inverter", sku: "INV-HYB-10K", unit: "pcs", currentStock: "3", minStockLevel: "5", unitCost: "75000.00", supplierName: "Havells Solar" },
    { name: "Lithium Battery 200Ah", category: "Battery", sku: "BAT-LI-200", unit: "pcs", currentStock: "6", minStockLevel: "4", unitCost: "45000.00", supplierName: "Luminous Power" },
    { name: "Mounting Structure (1 panel)", category: "Structure", sku: "STR-MNT-1P", unit: "sets", currentStock: "150", minStockLevel: "50", unitCost: "800.00", supplierName: "Steel Works India" },
    { name: "DC Cable 6mm (per meter)", category: "Cable", sku: "CBL-DC-6MM", unit: "meter", currentStock: "500", minStockLevel: "200", unitCost: "45.00" },
    { name: "AC Cable 4mm (per meter)", category: "Cable", sku: "CBL-AC-4MM", unit: "meter", currentStock: "350", minStockLevel: "200", unitCost: "38.00" },
    { name: "DC MCB 32A", category: "Switch", sku: "MCB-DC-32A", unit: "pcs", currentStock: "30", minStockLevel: "10", unitCost: "450.00" },
    { name: "AC MCB 63A", category: "Switch", sku: "MCB-AC-63A", unit: "pcs", currentStock: "25", minStockLevel: "10", unitCost: "380.00" },
    { name: "Net Meter (Bi-directional)", category: "Meter", sku: "MTR-NET-01", unit: "pcs", currentStock: "4", minStockLevel: "5", unitCost: "2500.00" },
    { name: "Power Drill", category: "Tools", sku: "TOOL-DRILL-01", unit: "pcs", currentStock: "5", minStockLevel: "2", unitCost: "3500.00" },
  ];

  const insertedInventory: { id: number }[] = [];
  for (const item of inventoryData) {
    const [inv] = await db.insert(inventoryItemsTable).values(item).onConflictDoNothing().returning({ id: inventoryItemsTable.id });
    if (inv) insertedInventory.push(inv);
  }

  // Service Calls
  const serviceCalls = [
    { customerName: "Geeta Sharma", customerPhone: "9595959595", address: "12 Solar Street, Bhopal", issueDescription: "Inverter showing error code E-04, system not producing power", status: "open", priority: "urgent", assignedEngineerId: engId, projectId: insertedProjects[4]?.id },
    { customerName: "Sunil Mehta", customerPhone: "9696969696", address: "45 Green Colony, Nagpur", issueDescription: "Generation dropped by 40% in last 2 weeks, panels may need cleaning", status: "in_progress", priority: "medium", assignedEngineerId: engId, projectId: insertedProjects[3]?.id },
    { customerName: "Rekha Iyer", customerPhone: "9797979797", address: "7 Sunrise Villa, Coimbatore", issueDescription: "Wifi connectivity issue with monitoring app", status: "open", priority: "low", assignedEngineerId: engId, projectId: insertedProjects[2]?.id },
    { customerName: "Dinesh Kapoor", customerPhone: "9111111111", address: "88 Market Road, Jaipur", issueDescription: "MCB tripping during peak load hours", status: "closed", priority: "high", assignedEngineerId: engId, closureNotes: "Replaced 32A MCB with 63A, tested under full load", closedAt: new Date(Date.now() - 3 * 86400000) },
  ];

  for (const sc of serviceCalls) {
    await db.insert(serviceCallsTable).values(sc);
  }

  // Activity log
  const activities = [
    { entityType: "lead", entityId: insertedLeads[0]?.id ?? 1, action: "created", description: "Lead created for Rahul Gupta", performedById: adminId ?? null },
    { entityType: "lead", entityId: insertedLeads[2]?.id ?? 3, action: "stage_changed", description: "Stage changed to site_visit", performedById: salesId ?? null },
    { entityType: "project", entityId: insertedProjects[0]?.id ?? 1, action: "created", description: "Project created for Pooja Nair", performedById: adminId ?? null },
    { entityType: "payment", entityId: 1, action: "received", description: "Advance payment of ₹1,05,000 received", performedById: adminId ?? null },
    { entityType: "service_call", entityId: 4, action: "closed", description: "Service call closed — MCB replaced", performedById: engId ?? null },
  ];

  for (const a of activities) {
    await db.insert(activitiesTable).values(a).catch(() => {});
  }

  console.log("✅ Database seeded successfully!");
  console.log("");
  console.log("Login credentials:");
  console.log("  Admin:     admin@solarcrm.com / admin123");
  console.log("  Sales:     ravi@solarcrm.com  / sales123");
  console.log("  Engineer:  priya@solarcrm.com / eng123");
  console.log("  Finance:   anita@solarcrm.com / fin123");
  console.log("  Warehouse: suresh@solarcrm.com / wh123");

  process.exit(0);
}

seed().catch(err => { console.error("Seed failed:", err); process.exit(1); });
