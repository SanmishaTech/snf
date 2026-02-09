/**
 * Utility functions for handling member photos
 */

import { backendUrl } from "@/config";

const BACKEND_URL = backendUrl;

export const resolveAssetUrl = (value?: string | null): string => {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:") || raw.startsWith("blob:")) {
    return raw;
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BACKEND_URL}${normalized}`;
};

/**
 * Returns the first available photo URL from a member record
 * Falls back to a seeded picsum.photos URL if no photos are available
 */
export const getBestMemberPhoto = (member: {
  id: string | number;
  profilePicture?: string | null;
  coverPhoto?: string | null;
  logo?: string | null;
}): string => {
  if (member.profilePicture) {
    return resolveAssetUrl(member.profilePicture);
  }

  if (member.coverPhoto) {
    return resolveAssetUrl(member.coverPhoto);
  }

  if (member.logo) {
    return resolveAssetUrl(member.logo);
  }

  return `https://picsum.photos/seed/${member.id}/200`;
};

/**
 * Returns an array of all available photo URLs from a member record
 */
export const getAllMemberPhotos = (member: {
  profilePicture?: string | null;
  coverPhoto?: string | null;
  logo?: string | null;
}): string[] => {
  const photos: string[] = [];

  if (member.profilePicture) {
    photos.push(resolveAssetUrl(`/uploads/members/${member.profilePicture}`));
  }

  if (member.coverPhoto) {
    photos.push(resolveAssetUrl(`/uploads/members/${member.coverPhoto}`));
  }

  if (member.logo) {
    photos.push(resolveAssetUrl(`/uploads/members/${member.logo}`));
  }

  return photos;
};
