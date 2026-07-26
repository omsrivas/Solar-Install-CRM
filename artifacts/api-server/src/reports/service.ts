import {
  getFinanceReport,
  getInventoryReport,
  getLeadsReport,
  getSalesReport,
  getServiceReport,
} from "@workspace/db";
import type { ReportQuery } from "./validation";

export const listLeadsReport = (filters: ReportQuery) => getLeadsReport(filters);
export const listSalesReport = (filters: ReportQuery) => getSalesReport(filters);
export const listFinanceReport = (filters: ReportQuery) => getFinanceReport(filters);
export const listServiceReport = (filters: ReportQuery) => getServiceReport(filters);
export const listInventoryReport = () => getInventoryReport();