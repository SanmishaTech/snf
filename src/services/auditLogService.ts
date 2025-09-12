import { get } from './apiService';

const API_BASE_URL = '/admin/snf-orders';

export interface SNFOrderAuditLogEntry {
  id: number;
  action: string;
  description: string;
  oldValue: any;
  newValue: any;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  } | null;
}

export interface SNFOrderAuditLogsResponse {
  success: boolean;
  data: SNFOrderAuditLogEntry[];
  count: number;
}

export const getSNFOrderAuditLogs = async (
  id: number,
  options: { limit?: number; offset?: number } = {}
): Promise<SNFOrderAuditLogsResponse> => {
  const params = new URLSearchParams();
  if (options.limit) params.append('limit', String(options.limit));
  if (options.offset) params.append('offset', String(options.offset));

  const url = params.toString()
    ? `${API_BASE_URL}/${id}/audit-logs?${params.toString()}`
    : `${API_BASE_URL}/${id}/audit-logs`;

  const response = await get<SNFOrderAuditLogsResponse>(url);
  return response;
};
