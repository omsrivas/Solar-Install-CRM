import type { Request, Response } from "express";
import {
  listFinanceReport,
  listInventoryReport,
  listLeadsReport,
  listSalesReport,
  listServiceReport,
} from "./service";
import { reportQuerySchema } from "./validation";

function parseReportQuery(
  request: Request,
  response: Response,
): Record<string, string> | null {
  const parsed = reportQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    response.status(400).json({ error: "Invalid report date range." });
    return null;
  }
  return parsed.data;
}

export async function getLeadsReportController(
  request: Request,
  response: Response,
): Promise<void> {
  const query = parseReportQuery(request, response);
  if (!query) return;
  try {
    response.json(await listLeadsReport(query));
  } catch {
    response.status(500).json({ error: "Unable to generate leads report." });
  }
}

export async function getSalesReportController(
  request: Request,
  response: Response,
): Promise<void> {
  const query = parseReportQuery(request, response);
  if (!query) return;
  try {
    response.json(await listSalesReport(query));
  } catch {
    response.status(500).json({ error: "Unable to generate sales report." });
  }
}

export async function getFinanceReportController(
  request: Request,
  response: Response,
): Promise<void> {
  const query = parseReportQuery(request, response);
  if (!query) return;
  try {
    response.json(await listFinanceReport(query));
  } catch {
    response.status(500).json({ error: "Unable to generate finance report." });
  }
}

export async function getServiceReportController(
  request: Request,
  response: Response,
): Promise<void> {
  const query = parseReportQuery(request, response);
  if (!query) return;
  try {
    response.json(await listServiceReport(query));
  } catch {
    response.status(500).json({ error: "Unable to generate service report." });
  }
}

export async function getInventoryReportController(
  _request: Request,
  response: Response,
): Promise<void> {
  try {
    response.json(await listInventoryReport());
  } catch {
    response.status(500).json({ error: "Unable to generate inventory report." });
  }
}