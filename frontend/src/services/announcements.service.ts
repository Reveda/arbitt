import { apiRequest } from "@/api/apiClient";

export type AnnouncementType = "info" | "warning" | "alert" | "update";

export type Announcement = {
  id: string;
  _id?: string;
  title: string;
  message: string;
  type: AnnouncementType;
  createdAt: string;
  createdBy: string;
};

export const announcementsService = {
  async getAnnouncements(search?: string, type?: string): Promise<Announcement[]> {
    try {
      let path = "/notifications/announcements";
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (type && type !== "all") params.append("type", type);
      
      const queryStr = params.toString();
      if (queryStr) {
        path += `?${queryStr}`;
      }

      const response = await apiRequest<{ announcements: Announcement[] }>(path, {
        method: "GET"
      });
      if (response.success) {
        return (response.data.announcements ?? []).map((ann) => ({
          ...ann,
          id: ann._id || ann.id
        }));
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
      return [];
    }
  },

  async createAnnouncement(title: string, message: string, type: AnnouncementType): Promise<Announcement | null> {
    try {
      const response = await apiRequest<{ announcement: Announcement }>("/admin/announcements", {
        method: "POST",
        body: { title, message, type }
      });
      if (response.success) {
        return response.data.announcement;
      }
      return null;
    } catch (err) {
      console.error("Failed to create announcement:", err);
      return null;
    }
  },

  async deleteAnnouncement(id: string): Promise<boolean> {
    try {
      const response = await apiRequest<void>(`/admin/announcements/${id}`, {
        method: "DELETE"
      });
      return response.success;
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      return false;
    }
  }
};
