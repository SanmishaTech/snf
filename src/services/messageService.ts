import { get, postupload, putupload, del } from './apiService';

export interface MessageData {
  id: number;
  heading: string;
  message: string;
  attachment: string | null;
  createdAt: string;
  updatedAt: string;
  chapterId?: number;
  powerTeamId?: number;
}

export interface MessageListResponse {
  messages: MessageData[];
  page: number;
  totalPages: number;
  totalMessages: number;
}

/**
 * Fetches messages with pagination, search, and sorting
 */
export const getMessages = async (
  page: number = 1,
  limit: number = 10,
  search: string = '',
  sortBy: string = 'createdAt',
  sortOrder: string = 'desc',
  chapterId?: number,
  powerTeamId?: number
): Promise<MessageListResponse> => {
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sortBy,
    sortOrder,
    search,
  });

  if (chapterId !== undefined) {
    queryParams.append('chapterId', chapterId.toString());
  }
  if (powerTeamId !== undefined) {
    queryParams.append('powerTeamId', powerTeamId.toString());
  }

  return get(`/messages?${queryParams.toString()}`);
};

/**
 * Fetches a single message by ID
 */
export const getMessage = async (id: string): Promise<MessageData> => {
  return get(`/messages/${id}`);
};

/**
 * Creates a new message with support for file attachment.
 * formData should include heading, message, and optionally an attachment file.
 * chapterId or powerTeamId should be appended to formData by the calling component based on user role/selection.
 */
export const createMessage = async (formData: FormData): Promise<MessageData> => {
  // The calling component (e.g., MessageForm.tsx) will be responsible for appending
  // 'chapterId' or 'powerTeamId' to the formData before calling this service.
  // Example: 
  // if (selectedChapterId) formData.append('chapterId', selectedChapterId.toString());
  // else if (selectedPowerTeamId) formData.append('powerTeamId', selectedPowerTeamId.toString());
  
  return postupload('/messages', formData);
};

/**
 * Updates an existing message
 */
export const updateMessage = async (id: string, formData: FormData): Promise<MessageData> => {
  return putupload(`/messages/${id}`, formData);
};

/**
 * Deletes a message
 */
export const deleteMessage = async (id: number): Promise<any> => {
  return del(`/messages/${id}`);
};

/**
 * Returns the URL for downloading an attachment
 */
export const getAttachmentUrl = (id: string): string => {
  return `/messages/${id}/attachment`;
}; 