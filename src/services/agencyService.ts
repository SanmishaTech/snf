import { api, get } from './apiService';

export interface Agency {
  id: number;
  name: string;
  contactPersonName?: string;
  mobile: string;
  address1: string;
  address2?: string;
  city: string;
  pincode: number;
  alternateMobile?: string;
  email?: string;
  userId: number;
  depotId?: number;
}

export const getAgencies = async (page = 1, limit = 10, search = ''): Promise<any> => {
  const response = await get(`/agencies?page=${page}&limit=${limit}&search=${search}`);
  return response.data;
};

export const getAgenciesList = async (): Promise<Agency[]> => {
  const response = await get('/agencies', {
    params: { limit: 1000 }, // Fetch a large number for list purposes
  });
  return response.data.data || response.data;
};
