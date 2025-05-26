import { post, get, del } from "./apiService";

export const createRequirement = (data: { memberId: number; heading: string; requirement: string; }) => {
  return post("/requirements", data);
};

export const getRequirementsByMember = (memberId: number) => {
  return get(`/requirements/member/${memberId}`);
};

export const getAllRequirements = () => {
  return get(`/requirements`);
};

export const deleteRequirement = (id: number) => {
  return del(`/requirements/${id}`);
};
