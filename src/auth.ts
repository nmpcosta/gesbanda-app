import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api';
import type {
  AttachEventPieceInput,
  AuthResponse,
  CreateMemberInput,
  CreateEventInput,
  CreateGroupInput,
  CreateRepertoirePieceInput,
  EventResponse,
  EventRsvpInput,
  EventRsvpResponse,
  EventRsvpsResponse,
  GroupAssetResponse,
  GroupAssetsResponse,
  GroupDocumentResponse,
  GroupDocumentsResponse,
  GroupMemberResponse,
  GroupMembersResponse,
  EventsResponse,
  RepertoirePieceResponse,
  RepertoirePiecesResponse,
  GroupResponse,
  GroupsResponse,
  LoginInput,
  MeResponse,
  RegisterInput,
  UpdateMemberInput,
} from './types';

export const TOKEN_STORAGE_KEY = '@gesbanda/auth-token';

export function login(input: LoginInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return apiRequest<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function me(token: string): Promise<MeResponse> {
  return apiRequest<MeResponse>('/auth/me', { method: 'GET' }, token);
}

export function logout(token: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/logout', { method: 'POST' }, token);
}

export function listGroups(token: string): Promise<GroupsResponse> {
  return apiRequest<GroupsResponse>('/groups', { method: 'GET' }, token);
}

export function createGroup(token: string, input: CreateGroupInput): Promise<GroupResponse> {
  return apiRequest<GroupResponse>(
    '/groups',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );
}

export function listEvents(token: string, groupId: number): Promise<EventsResponse> {
  return apiRequest<EventsResponse>(`/groups/${groupId}/events`, { method: 'GET' }, token);
}

export function createEvent(
  token: string,
  groupId: number,
  input: CreateEventInput
): Promise<EventResponse> {
  return apiRequest<EventResponse>(
    `/groups/${groupId}/events`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );
}

export function setEventRsvp(
  token: string,
  eventId: number,
  input: EventRsvpInput
): Promise<EventRsvpResponse> {
  return apiRequest<EventRsvpResponse>(
    `/events/${eventId}/rsvp`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
    token
  );
}

export function getEventRsvps(token: string, eventId: number): Promise<EventRsvpsResponse> {
  return apiRequest<EventRsvpsResponse>(`/events/${eventId}/rsvps`, { method: 'GET' }, token);
}

export function listGroupMembers(token: string, groupId: number): Promise<GroupMembersResponse> {
  return apiRequest<GroupMembersResponse>(`/groups/${groupId}/members`, { method: 'GET' }, token);
}

export function inviteGroupMember(
  token: string,
  groupId: number,
  input: CreateMemberInput
): Promise<GroupMemberResponse> {
  return apiRequest<GroupMemberResponse>(
    `/groups/${groupId}/members`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );
}

export function updateGroupMember(
  token: string,
  groupId: number,
  memberId: number,
  input: UpdateMemberInput
): Promise<GroupMemberResponse> {
  return apiRequest<GroupMemberResponse>(
    `/groups/${groupId}/members/${memberId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
    token
  );
}

export function removeGroupMember(
  token: string,
  groupId: number,
  memberId: number
): Promise<void> {
  return apiRequest<void>(`/groups/${groupId}/members/${memberId}`, { method: 'DELETE' }, token);
}

export function listRepertoirePieces(
  token: string,
  groupId: number
): Promise<RepertoirePiecesResponse> {
  return apiRequest<RepertoirePiecesResponse>(`/groups/${groupId}/pieces`, { method: 'GET' }, token);
}

export function createRepertoirePiece(
  token: string,
  groupId: number,
  input: CreateRepertoirePieceInput
): Promise<RepertoirePieceResponse> {
  return apiRequest<RepertoirePieceResponse>(
    `/groups/${groupId}/pieces`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );
}

export function listEventPieces(token: string, eventId: number): Promise<RepertoirePiecesResponse> {
  return apiRequest<RepertoirePiecesResponse>(`/events/${eventId}/pieces`, { method: 'GET' }, token);
}

export function attachPieceToEvent(
  token: string,
  eventId: number,
  input: AttachEventPieceInput
): Promise<RepertoirePieceResponse> {
  return apiRequest<RepertoirePieceResponse>(
    `/events/${eventId}/pieces`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token
  );
}

export function detachPieceFromEvent(
  token: string,
  eventId: number,
  pieceId: number
): Promise<void> {
  return apiRequest<void>(`/events/${eventId}/pieces/${pieceId}`, { method: 'DELETE' }, token);
}

export function listGroupAssets(token: string, groupId: number): Promise<GroupAssetsResponse> {
  return apiRequest<GroupAssetsResponse>(`/groups/${groupId}/assets`, { method: 'GET' }, token);
}

export function uploadGroupAsset(
  token: string,
  groupId: number,
  formData: FormData
): Promise<GroupAssetResponse> {
  return apiRequest<GroupAssetResponse>(
    `/groups/${groupId}/assets`,
    {
      method: 'POST',
      body: formData,
    },
    token
  );
}

export function listGroupDocuments(token: string, groupId: number): Promise<GroupDocumentsResponse> {
  return apiRequest<GroupDocumentsResponse>(`/groups/${groupId}/documents`, { method: 'GET' }, token);
}

export function uploadGroupDocument(
  token: string,
  groupId: number,
  formData: FormData
): Promise<GroupDocumentResponse> {
  return apiRequest<GroupDocumentResponse>(
    `/groups/${groupId}/documents`,
    {
      method: 'POST',
      body: formData,
    },
    token
  );
}

export function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string): Promise<void> {
  return AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): Promise<void> {
  return AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}
