import { get, post, put, del as deleteRequest } from './apiService';

export interface Training {
  id: number;
  trainingDate: string;
  trainingTopic: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingListResponse {
  trainings: Training[];
  page: number;
  totalPages: number;
  totalTrainings: number;
}

export const getTrainings = async (
  page = 1,
  limit = 10,
  search = '',
  sortBy = 'trainingDate',
  sortOrder = 'desc'
): Promise<TrainingListResponse> => {
  return await get('/trainings', { page, limit, search, sortBy, sortOrder });
};

export const getTrainingById = async (id: number): Promise<Training> => {
  return await get(`/trainings/${id}`);
};

export const createTraining = async (data: Omit<Training, 'id' | 'createdAt' | 'updatedAt'>): Promise<Training> => {
  return await post('/trainings', data, {});
};

export const updateTraining = async (
  id: number,
  data: Partial<Omit<Training, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<Training> => {
  return await put(`/trainings/${id}`, data, {});
};

export const deleteTraining = async (id: number): Promise<{ message: string }> => {
  return await deleteRequest(`/trainings/${id}`);
};

export default {
  getTrainings,
  getTrainingById,
  createTraining,
  updateTraining,
  deleteTraining,
}; 