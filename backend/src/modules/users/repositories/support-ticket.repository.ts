import { SupportTicketModel } from "../models/support-ticket.model";

export class SupportTicketRepository {
  async create(userId: string, subject: string, message: string) {
    return SupportTicketModel.create({
      userId,
      subject,
      message,
      status: "pending",
    });
  }

  async findByUserId(userId: string) {
    return SupportTicketModel.find({ userId }).sort({ createdAt: -1 }).lean();
  }

  async findAll() {
    return SupportTicketModel.find()
      .populate("userId", "email username")
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(ticketId: string) {
    return SupportTicketModel.findById(ticketId).populate("userId", "email username").lean();
  }

  async resolve(ticketId: string, reply: string) {
    return SupportTicketModel.findByIdAndUpdate(
      ticketId,
      {
        $set: {
          status: "resolved",
          reply,
          resolvedAt: new Date(),
        },
      },
      { new: true },
    ).lean();
  }
}

export const supportTicketRepository = new SupportTicketRepository();
