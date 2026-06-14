import { supportTicketRepository } from "../repositories/support-ticket.repository";
import { ApiError } from "../../../utils/ApiError";
import { HTTP_STATUS } from "../../../constants/http";

export class SupportTicketService {
  async createTicket(userId: string, input: { subject: string; message: string }) {
    if (!input.subject.trim() || !input.message.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Subject and message cannot be empty.");
    }
    return supportTicketRepository.create(userId, input.subject.trim(), input.message.trim());
  }

  async getUserTickets(userId: string) {
    return supportTicketRepository.findByUserId(userId);
  }

  async getAllTickets() {
    return supportTicketRepository.findAll();
  }

  async resolveTicket(ticketId: string, reply: string) {
    const ticket = await supportTicketRepository.findById(ticketId);
    if (!ticket) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, "Support ticket not found.");
    }
    if (ticket.status === "resolved") {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Support ticket is already resolved.");
    }
    if (!reply.trim()) {
      throw new ApiError(HTTP_STATUS.BAD_REQUEST, "Reply message cannot be empty.");
    }
    return supportTicketRepository.resolve(ticketId, reply.trim());
  }
}

export const supportTicketService = new SupportTicketService();
