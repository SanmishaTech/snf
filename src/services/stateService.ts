import { get, post, put, del } from "./apiService";

export const getStates = async (
  page: number = 1,
  limit: number = 10,
  search: string = "",
  sortBy: string = "name",
  sortOrder: "asc" | "desc" = "asc"
) => {
  const response = await get(
    `/api/states?page=${page}&limit=${limit}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}`
  );
  return response;
};

export const getStateById = async (id: string) => {
  return await get(`/api/states/${id}`);
};

export const createState = async (data: { name: string }) => {
  return await post("/api/states", data);
};

export const updateState = async (id: string, data: { name: string }) => {
  return await put(`/api/states/${id}`, data);
};

export const deleteState = async (id: number) => {
  return await del(`/api/states/${id}`);
};
