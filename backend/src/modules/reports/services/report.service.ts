import { reportRepository } from "../repositories/report.repository";
import type { EarningsResponseDto, UserDashboardMetricsResponseDto } from "../dtos/report.dto";
import type { z } from "zod";
import { buildDateRangeFilter } from "../../../utils/dateRange";
import type { listEarningsQuerySchema } from "../validations/report.validation";

type ListEarningsInput = z.infer<typeof listEarningsQuerySchema>;

export class ReportService {
  getDashboardMetrics(userId: string): Promise<UserDashboardMetricsResponseDto> {
    return reportRepository.getDashboardMetrics(userId);
  }

  getEarnings(userId: string, input: ListEarningsInput): Promise<EarningsResponseDto> {
    return reportRepository.getEarnings({
      userId,
      page: input.page,
      limit: input.limit,
      status: input.status,
      kind: input.kind,
      dateRange: buildDateRangeFilter({ fromDate: input.fromDate, toDate: input.toDate }),
    });
  }
}

export const reportService = new ReportService();
