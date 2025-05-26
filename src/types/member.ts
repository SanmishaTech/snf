// Member data interface definition
export interface MemberData {
  id: string;
  memberName: string;
  profilePicture: string;
  coverPhoto?: string;
  email?: string;
  phone?: string;
  designation?: string;
  department?: string;
  joinDate?: string;
  skills?: string[];
  meetingsAttended?: number;
  totalMeetings?: number;
  projects?: { name: string; role: string; status: string }[];
  achievements?: string[];
  lastActive?: string;
  category?: string;
  organizationName?: string;

  // Profile statistics
  testimonialsCount?: number;
  businessGivenAmount?: number;
  businessReceivedAmount?: number;
  referencesGivenCount?: number;
  referencesReceivedCount?: number;
  oneToOnesCount?: number;

  // Business details
  businessDetails?: {
    gstNo?: string;
    organizationEmail?: string;
    organizationPhone?: string;
    organizationLandline?: string;
    organizationWebsite?: string;
    organizationAddress?: string;
    organizationDescription?: string;
  };

  // Personal details
  personalDetails?: {
    gender?: string;
    dob?: string;
    address?: string;
  };

  // User information, including role
  users?: {
    id?: number;
    name?: string;
    email?: string;
    role?: string;
    active?: boolean;
    lastLogin?: string;
  };
}