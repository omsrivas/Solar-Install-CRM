import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD.");

export const reportQuerySchema = z
  .object({
    fromDate: isoDate.optional(),
    toDate: isoDate.optional(),
  })
  .refine(
    ({ fromDate, toDate }: { fromDate?: string; toDate?: string }) =>
      !fromDate || !toDate || fromDate <= toDate,
    { message: "fromDate must be before or equal to toDate." },
  );

export type ReportQuery = z.infer<typeof reportQuerySchema>;
