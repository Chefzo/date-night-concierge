export const REQUEST_STATUSES = [
  "new",
  "contacted",
  "confirmed",
  "done",
  "archived",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export type ConciergeRequest = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  vibe: string | null;
  budget_range: string | null;
  preferred_night: string | null;
  party_notes: string | null;
  sms_consent: boolean;
  sms_consent_at: string | null;
  status: RequestStatus;
  created_at: string;
};

export type Booking = {
  id: string;
  request_id: string | null;
  package_id: string | null;
  date_of: string | null;
  venues_final: string | null;
  est_check: number | null;
  shoulder_night: boolean;
  confirmed_at: string | null;
  created_at: string;
};

export type Package = {
  id: string;
  name: string;
  description: string | null;
  venues: string | null;
  est_total: number | null;
  vibe_tags: string[] | null;
  active: boolean;
  created_at: string;
};
