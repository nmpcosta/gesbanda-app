export type UserProfile = {
  first_name: string;
  last_name: string;
  photo_url: string | null;
  phone: string | null;
  instruments: string[];
  role_label: string | null;
  participation_status: string;
};

export type GroupSummary = {
  id: number;
  owner_user_id: number;
  name: string;
  slug: string;
  group_type: string;
  location: string | null;
  description: string | null;
  plan_tier: string;
  is_active: boolean;
  memberships_count?: number;
  membership_status?: 'invited' | 'active' | 'inactive' | null;
  can_manage?: boolean;
  color?: string;
};

export type EventSummary = {
  id: number;
  group_id: number;
  created_by_user_id: number | null;
  title: string;
  event_type: 'rehearsal' | 'concert' | 'activity' | 'meeting' | 'internal';
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  reminder_hours_before: number[] | null;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
};

export type User = {
  id: number;
  name: string;
  email: string;
  profile?: UserProfile;
  groups?: GroupSummary[];
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type MeResponse = {
  user: User;
};

export type GroupsResponse = {
  data: GroupSummary[];
};

export type GroupResponse = {
  data: GroupSummary;
};

export type EventsResponse = {
  data: EventSummary[];
};

export type EventResponse = {
  data: EventSummary;
};

export type EventRsvpResponse = {
  data: {
    id: number;
    event_id: number;
    user_id: number;
    status: 'yes' | 'no' | 'maybe';
    note: string | null;
    responded_at: string | null;
  };
};

export type EventRsvpsResponse = {
  data: {
    id: number;
    event_id: number;
    user_id: number;
    status: 'yes' | 'no' | 'maybe';
    note: string | null;
    responded_at: string | null;
  }[];
  summary: {
    yes: number;
    no: number;
    maybe: number;
  };
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone?: string;
  instruments?: string[];
  role_label?: string;
};

export type CreateGroupInput = {
  name: string;
  group_type: 'band' | 'choir' | 'orchestra' | 'ensemble' | 'other';
  location?: string;
  description?: string;
};

export type CreateEventInput = {
  title: string;
  event_type: 'rehearsal' | 'concert' | 'activity' | 'meeting' | 'internal';
  starts_at: string;
  ends_at?: string;
  location?: string;
  description?: string;
};

export type EventRsvpInput = {
  status: 'yes' | 'no' | 'maybe';
  note?: string;
};

export type GroupMemberSummary = {
  id: number;
  group_id: number;
  user_id: number;
  membership_role: 'admin' | 'member' | 'board' | 'conductor';
  section: string | null;
  instrument: string | null;
  sections?: string[];
  instruments?: string[];
  status: 'invited' | 'active' | 'inactive';
  joined_at: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
  };
};

export type GroupMembersResponse = {
  data: GroupMemberSummary[];
};

export type GroupMemberResponse = {
  data: GroupMemberSummary;
};

export type CreateMemberInput = {
  email: string;
  name?: string;
  membership_role: GroupMemberSummary['membership_role'];
  section?: string;
  instrument?: string;
  status?: GroupMemberSummary['status'];
};

export type UpdateMemberInput = {
  membership_role?: GroupMemberSummary['membership_role'];
  section?: string;
  instrument?: string;
  status?: GroupMemberSummary['status'];
};

export type RepertoirePieceSummary = {
  id: number;
  group_id: number;
  title: string;
  composer: string | null;
  arranger: string | null;
  duration_seconds: number | null;
  difficulty_level: string | null;
  notes: string | null;
  pivot?: {
    piece_order: number | null;
    notes: string | null;
  };
};

export type RepertoirePiecesResponse = {
  data: RepertoirePieceSummary[];
};

export type RepertoirePieceResponse = {
  data: RepertoirePieceSummary;
};

export type CreateRepertoirePieceInput = {
  title: string;
  composer?: string;
  arranger?: string;
  duration_seconds?: number;
  difficulty_level?: string;
  notes?: string;
};

export type AttachEventPieceInput = {
  repertoire_piece_id: number;
  piece_order?: number;
  notes?: string;
};

export type GroupAssetSummary = {
  id: number;
  group_id: number;
  uploaded_by_user_id: number | null;
  repertoire_piece_id: number | null;
  event_id: number | null;
  asset_type: string;
  title: string;
  file_url: string;
  instrument: string | null;
  meta: {
    path?: string;
    original_name?: string;
    mime?: string;
    size?: number;
  } | null;
};

export type GroupAssetsResponse = {
  data: GroupAssetSummary[];
};

export type GroupAssetResponse = {
  data: GroupAssetSummary;
};

export type GroupDocumentSummary = {
  id: number;
  group_id: number;
  uploaded_by_user_id: number | null;
  title: string;
  document_type: string | null;
  category: string | null;
  file_url: string;
  relevance: number;
  published_at: string | null;
};

export type GroupDocumentsResponse = {
  data: GroupDocumentSummary[];
};

export type GroupDocumentResponse = {
  data: GroupDocumentSummary;
};
