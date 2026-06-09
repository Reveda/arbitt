import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import type { ListRolesResponseDto } from "../dtos/role.dto";
import { roleService } from "../services/role.service";

export const listRoles = catchAsync(async (_req: Request, res: Response) => {
  const result = await roleService.listRoles();
  res
    .status(HTTP_STATUS.OK)
    .json(apiResponse<ListRolesResponseDto>(HTTP_STATUS.OK, "Roles loaded.", result));
});
