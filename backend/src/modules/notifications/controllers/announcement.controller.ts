import type { Request, Response } from "express";
import { HTTP_STATUS } from "../../../constants/http";
import { apiResponse } from "../../../utils/ApiResponse";
import { catchAsync } from "../../../utils/catchAsync";
import { AnnouncementModel } from "../models/announcement.model";
import { UserModel } from "../../users/models/user.model";

export const listAnnouncements = catchAsync(async (req: Request, res: Response) => {
  const { search, type } = req.query;
  const filter: any = {};
  
  if (type && type !== "all") {
    filter.type = type;
  }
  
  if (search) {
    filter.$or = [
      { title: { $regex: search as string, $options: "i" } },
      { message: { $regex: search as string, $options: "i" } }
    ];
  }

  const announcements = await AnnouncementModel.find(filter).sort({ createdAt: -1 });
  res.status(HTTP_STATUS.OK).json(
    apiResponse(HTTP_STATUS.OK, "Announcements loaded successfully.", {
      announcements
    })
  );
});

export const createAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const { title, message, type } = req.body;
  if (!title || !message || !type) {
    res.status(HTTP_STATUS.BAD_REQUEST).json(
      apiResponse(HTTP_STATUS.BAD_REQUEST, "Title, message, and type are required.", {})
    );
    return;
  }
  
  const user = await UserModel.findById(req.user!.id).select("username").lean();
  const createdBy = user?.username || "Admin";

  const newAnnouncement = await AnnouncementModel.create({
    title,
    message,
    type,
    createdBy
  });
  res.status(HTTP_STATUS.CREATED).json(
    apiResponse(HTTP_STATUS.CREATED, "Announcement published successfully.", {
      announcement: newAnnouncement
    })
  );
});

export const deleteAnnouncement = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const deleted = await AnnouncementModel.findByIdAndDelete(id);
  if (!deleted) {
    res.status(HTTP_STATUS.NOT_FOUND).json(
      apiResponse(HTTP_STATUS.NOT_FOUND, "Announcement not found.", {})
    );
    return;
  }
  res.status(HTTP_STATUS.OK).json(
    apiResponse(HTTP_STATUS.OK, "Announcement deleted successfully.", {})
  );
});
