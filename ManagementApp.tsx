import React, { useEffect, useMemo, useState } from 'react';
import { ScoreReader, assetFile, documentFile, type MusicFile } from './src/ScoreReader';
import { useWords } from './src/mobileUI';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';
import {
  attachPieceToEvent,
  clearStoredToken,
  createEvent,
  createGroup,
  createRepertoirePiece,
  detachPieceFromEvent,
  getEventRsvps,
  getStoredToken,
  inviteGroupMember,
  listEventPieces,
  listEvents,
  listGroupAssets,
  listGroupDocuments,
  listGroupMembers,
  listGroups,
  listRepertoirePieces,
  login,
  me,
  register,
  removeGroupMember,
  setEventRsvp,
  setStoredToken,
  updateGroupMember,
  uploadGroupAsset,
  uploadGroupDocument,
} from './src/auth';
import type {
  CreateEventInput,
  CreateGroupInput,
  EventSummary,
  GroupAssetSummary,
  GroupDocumentSummary,
  GroupMemberSummary,
  GroupSummary,
  RepertoirePieceSummary,
  User,
} from './src/types';

type AuthMode = 'login' | 'register';

type LoginForm = {
  email: string;
  password: string;
};

type RegisterForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

type GroupForm = {
  name: string;
  groupType: CreateGroupInput['group_type'];
  location: string;
};

type EventForm = {
  title: string;
  eventType: CreateEventInput['event_type'];
  startsAt: string;
  endsAt: string;
  location: string;
};

type MemberForm = {
  email: string;
  name: string;
  membershipRole: GroupMemberSummary['membership_role'];
  section: string;
  instrument: string;
  status: GroupMemberSummary['status'];
};

type PieceForm = {
  title: string;
  composer: string;
  arranger: string;
  difficultyLevel: string;
  notes: string;
};

type EventPieceForm = {
  repertoirePieceId: string;
  pieceOrder: string;
  notes: string;
};

type AssetForm = {
  title: string;
  assetType: string;
  instrument: string;
  eventId: string;
  repertoirePieceId: string;
  fileUri: string;
  fileName: string;
  fileType: string;
};

type DocumentForm = {
  title: string;
  documentType: string;
  category: string;
  relevance: string;
  fileUri: string;
  fileName: string;
  fileType: string;
};

type RsvpSummary = {
  yes: number;
  no: number;
  maybe: number;
};

const initialLoginForm: LoginForm = { email: '', password: '' };
const initialRegisterForm: RegisterForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
};
const initialGroupForm: GroupForm = { name: '', groupType: 'band', location: '' };
const initialMemberForm: MemberForm = {
  email: '',
  name: '',
  membershipRole: 'member',
  section: '',
  instrument: '',
  status: 'invited',
};
const initialPieceForm: PieceForm = {
  title: '',
  composer: '',
  arranger: '',
  difficultyLevel: '',
  notes: '',
};
const initialEventPieceForm: EventPieceForm = {
  repertoirePieceId: '',
  pieceOrder: '',
  notes: '',
};
const initialAssetForm: AssetForm = {
  title: '',
  assetType: 'score',
  instrument: '',
  eventId: '',
  repertoirePieceId: '',
  fileUri: '',
  fileName: '',
  fileType: 'application/pdf',
};
const initialDocumentForm: DocumentForm = {
  title: '',
  documentType: '',
  category: '',
  relevance: '0',
  fileUri: '',
  fileName: '',
  fileType: 'application/pdf',
};

const groupTypeOptions: { label: string; value: GroupForm['groupType'] }[] = [
  { label: 'Banda', value: 'band' },
  { label: 'Coro', value: 'choir' },
  { label: 'Orquestra', value: 'orchestra' },
  { label: 'Ensemble', value: 'ensemble' },
  { label: 'Outro', value: 'other' },
];

const eventTypeOptions: { label: string; value: EventForm['eventType'] }[] = [
  { label: 'Ensaio', value: 'rehearsal' },
  { label: 'Concerto', value: 'concert' },
  { label: 'Atividade', value: 'activity' },
  { label: 'Reuniao', value: 'meeting' },
  { label: 'Interno', value: 'internal' },
];

function nextIsoLocal(hoursAhead: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hoursAhead);
  return date.toISOString().slice(0, 16);
}

function getInitialEventForm(): EventForm {
  return {
    title: '',
    eventType: 'rehearsal',
    startsAt: nextIsoLocal(2),
    endsAt: nextIsoLocal(4),
    location: '',
  };
}

function instrumentsToText(user: User | null): string {
  const instruments = user?.profile?.instruments ?? [];
  return instruments.length > 0 ? instruments.join(', ') : 'Sem instrumentos definidos';
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function ManagementApp({ onSignOut }: { onSignOut: () => void }): React.JSX.Element {
  const t = useWords();
  const [reader, setReader] = useState<MusicFile[] | null>(null);
  const [mode, setMode] = useState<AuthMode>('login');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [members, setMembers] = useState<GroupMemberSummary[]>([]);
  const [pieces, setPieces] = useState<RepertoirePieceSummary[]>([]);
  const [eventPieces, setEventPieces] = useState<RepertoirePieceSummary[]>([]);
  const [assets, setAssets] = useState<GroupAssetSummary[]>([]);
  const [documents, setDocuments] = useState<GroupDocumentSummary[]>([]);
  const [rsvpSummary, setRsvpSummary] = useState<RsvpSummary | null>(null);

  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingPieces, setLoadingPieces] = useState(false);
  const [loadingEventPieces, setLoadingEventPieces] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittingGroup, setSubmittingGroup] = useState(false);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [submittingMember, setSubmittingMember] = useState(false);
  const [submittingPiece, setSubmittingPiece] = useState(false);
  const [submittingEventPiece, setSubmittingEventPiece] = useState(false);
  const [submittingAsset, setSubmittingAsset] = useState(false);
  const [submittingDocument, setSubmittingDocument] = useState(false);
  const [submittingRsvpId, setSubmittingRsvpId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState<LoginForm>(initialLoginForm);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(initialRegisterForm);
  const [groupForm, setGroupForm] = useState<GroupForm>(initialGroupForm);
  const [eventForm, setEventForm] = useState<EventForm>(getInitialEventForm());
  const [memberForm, setMemberForm] = useState<MemberForm>(initialMemberForm);
  const [pieceForm, setPieceForm] = useState<PieceForm>(initialPieceForm);
  const [eventPieceForm, setEventPieceForm] = useState<EventPieceForm>(initialEventPieceForm);
  const [assetForm, setAssetForm] = useState<AssetForm>(initialAssetForm);
  const [documentForm, setDocumentForm] = useState<DocumentForm>(initialDocumentForm);

  async function loadGroups(currentToken: string) {
    setLoadingGroups(true);
    try {
      const response = await listGroups(currentToken);
      setGroups(response.data);

      setSelectedGroupId((prev) => {
        if (prev && response.data.some((group) => group.id === prev)) {
          return prev;
        }

        return response.data[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar grupos.');
    } finally {
      setLoadingGroups(false);
    }
  }

  async function loadEvents(currentToken: string, groupId: number) {
    setLoadingEvents(true);
    try {
      const response = await listEvents(currentToken, groupId);
      setEvents(response.data);

      setSelectedEventId((prev) => {
        if (prev && response.data.some((eventItem) => eventItem.id === prev)) {
          return prev;
        }

        return response.data[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar eventos.');
    } finally {
      setLoadingEvents(false);
    }
  }

  async function loadMembers(currentToken: string, groupId: number) {
    setLoadingMembers(true);
    try {
      const response = await listGroupMembers(currentToken, groupId);
      setMembers(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar membros.');
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadPieces(currentToken: string, groupId: number) {
    setLoadingPieces(true);
    try {
      const response = await listRepertoirePieces(currentToken, groupId);
      setPieces(response.data);
      setEventPieceForm((previous) => {
        if (
          previous.repertoirePieceId &&
          response.data.some((piece) => piece.id === Number(previous.repertoirePieceId))
        ) {
          return previous;
        }

        return {
          ...previous,
          repertoirePieceId: response.data[0] ? String(response.data[0].id) : '',
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar repertorio.');
    } finally {
      setLoadingPieces(false);
    }
  }

  async function loadEventPieces(currentToken: string, eventId: number) {
    setLoadingEventPieces(true);
    try {
      const response = await listEventPieces(currentToken, eventId);
      setEventPieces(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar pecas do evento.');
    } finally {
      setLoadingEventPieces(false);
    }
  }

  async function loadAssets(currentToken: string, groupId: number) {
    setLoadingAssets(true);
    try {
      const response = await listGroupAssets(currentToken, groupId);
      setAssets(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar partituras.');
    } finally {
      setLoadingAssets(false);
    }
  }

  async function loadDocuments(currentToken: string, groupId: number) {
    setLoadingDocuments(true);
    try {
      const response = await listGroupDocuments(currentToken, groupId);
      setDocuments(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar documentos.');
    } finally {
      setLoadingDocuments(false);
    }
  }

  async function loadRsvpSummary(currentToken: string, eventId: number) {
    setLoadingSummary(true);
    try {
      const response = await getEventRsvps(currentToken, eventId);
      setRsvpSummary(response.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel carregar resumo de RSVP.');
      setRsvpSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const storedToken = await getStoredToken();
        if (!storedToken) {
          if (active) {
            setLoadingSession(false);
          }
          return;
        }

        const response = await me(storedToken);
        if (!active) {
          return;
        }

        setToken(storedToken);
        setUser(response.user);
        await loadGroups(storedToken);
      } catch {
        if (!active) {
          return;
        }

        await clearStoredToken();
        setToken(null);
        setUser(null);
        setGroups([]);
        setSelectedGroupId(null);
        setEvents([]);
        setSelectedEventId(null);
        setMembers([]);
        setPieces([]);
        setEventPieces([]);
        setAssets([]);
        setDocuments([]);
        setRsvpSummary(null);
        setError('Sessao expirada. Faz login novamente.');
      } finally {
        if (active) {
          setLoadingSession(false);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!token || !selectedGroupId) {
      setEvents([]);
      setSelectedEventId(null);
      setMembers([]);
      setPieces([]);
      setEventPieces([]);
      setAssets([]);
      setDocuments([]);
      setRsvpSummary(null);
      return;
    }

    loadEvents(token, selectedGroupId);
    loadMembers(token, selectedGroupId);
    loadPieces(token, selectedGroupId);
    loadAssets(token, selectedGroupId);
    loadDocuments(token, selectedGroupId);
  }, [token, selectedGroupId]);

  useEffect(() => {
    if (!token || !selectedEventId) {
      setEventPieces([]);
      setRsvpSummary(null);
      return;
    }

    loadRsvpSummary(token, selectedEventId);
    loadEventPieces(token, selectedEventId);
  }, [token, selectedEventId]);

  const groupsCount = useMemo(() => groups.length, [groups]);

  async function handleLogin() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await login({
        email: loginForm.email.trim(),
        password: loginForm.password,
      });

      await setStoredToken(response.token);
      setToken(response.token);
      setUser(response.user);
      await loadGroups(response.token);
      setSuccess('Sessao iniciada com sucesso.');
      setLoginForm(initialLoginForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao iniciar sessao.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister() {
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await register({
        first_name: registerForm.firstName.trim(),
        last_name: registerForm.lastName.trim(),
        email: registerForm.email.trim(),
        password: registerForm.password,
        password_confirmation: registerForm.passwordConfirmation,
      });

      await setStoredToken(response.token);
      setToken(response.token);
      setUser(response.user);
      await loadGroups(response.token);
      setSuccess('Conta criada e sessao iniciada.');
      setRegisterForm(initialRegisterForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar conta.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateGroup() {
    if (!token) {
      return;
    }

    setSubmittingGroup(true);
    setError(null);
    setSuccess(null);

    try {
      await createGroup(token, {
        name: groupForm.name.trim(),
        group_type: groupForm.groupType,
        location: groupForm.location.trim() || undefined,
      });

      await loadGroups(token);
      setGroupForm(initialGroupForm);
      setSuccess('Grupo criado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar grupo.');
    } finally {
      setSubmittingGroup(false);
    }
  }

  async function handleCreateEvent() {
    if (!token || !selectedGroupId) {
      return;
    }

    setSubmittingEvent(true);
    setError(null);
    setSuccess(null);

    try {
      await createEvent(token, selectedGroupId, {
        title: eventForm.title.trim(),
        event_type: eventForm.eventType,
        starts_at: new Date(eventForm.startsAt).toISOString(),
        ends_at: eventForm.endsAt ? new Date(eventForm.endsAt).toISOString() : undefined,
        location: eventForm.location.trim() || undefined,
      });

      await loadEvents(token, selectedGroupId);
      setEventForm(getInitialEventForm());
      setSuccess('Evento criado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar evento.');
    } finally {
      setSubmittingEvent(false);
    }
  }

  async function handleInviteMember() {
    if (!token || !selectedGroupId) {
      return;
    }

    setSubmittingMember(true);
    setError(null);
    setSuccess(null);

    try {
      await inviteGroupMember(token, selectedGroupId, {
        email: memberForm.email.trim(),
        name: memberForm.name.trim() || undefined,
        membership_role: memberForm.membershipRole,
        section: memberForm.section.trim() || undefined,
        instrument: memberForm.instrument.trim() || undefined,
        status: memberForm.status,
      });

      await loadMembers(token, selectedGroupId);
      setMemberForm(initialMemberForm);
      setSuccess('Membro convidado/atualizado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao convidar membro.');
    } finally {
      setSubmittingMember(false);
    }
  }

  async function handleToggleMemberStatus(
    member: GroupMemberSummary,
    status: GroupMemberSummary['status']
  ) {
    if (!token || !selectedGroupId) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await updateGroupMember(token, selectedGroupId, member.id, { status });
      await loadMembers(token, selectedGroupId);
      setSuccess('Estado do membro atualizado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar membro.');
    }
  }

  async function handleRemoveMember(member: GroupMemberSummary) {
    if (!token || !selectedGroupId) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await removeGroupMember(token, selectedGroupId, member.id);
      await loadMembers(token, selectedGroupId);
      setSuccess(`Membro ${member.user?.name ?? member.user?.email ?? ''} removido.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover membro.');
    }
  }

  async function handleCreatePiece() {
    if (!token || !selectedGroupId) {
      return;
    }

    setSubmittingPiece(true);
    setError(null);
    setSuccess(null);

    try {
      await createRepertoirePiece(token, selectedGroupId, {
        title: pieceForm.title.trim(),
        composer: pieceForm.composer.trim() || undefined,
        arranger: pieceForm.arranger.trim() || undefined,
        difficulty_level: pieceForm.difficultyLevel.trim() || undefined,
        notes: pieceForm.notes.trim() || undefined,
      });

      await loadPieces(token, selectedGroupId);
      setPieceForm(initialPieceForm);
      setSuccess('Peca adicionada ao repertorio.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar peca.');
    } finally {
      setSubmittingPiece(false);
    }
  }

  async function handleAttachPiece() {
    if (!token || !selectedEventId || !eventPieceForm.repertoirePieceId) {
      return;
    }

    setSubmittingEventPiece(true);
    setError(null);
    setSuccess(null);

    try {
      await attachPieceToEvent(token, selectedEventId, {
        repertoire_piece_id: Number(eventPieceForm.repertoirePieceId),
        piece_order: eventPieceForm.pieceOrder
          ? Number(eventPieceForm.pieceOrder)
          : undefined,
        notes: eventPieceForm.notes.trim() || undefined,
      });

      await loadEventPieces(token, selectedEventId);
      setEventPieceForm((previous) => ({ ...previous, pieceOrder: '', notes: '' }));
      setSuccess('Peca associada ao evento.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao associar peca ao evento.');
    } finally {
      setSubmittingEventPiece(false);
    }
  }

  async function handleDetachPiece(pieceId: number) {
    if (!token || !selectedEventId) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await detachPieceFromEvent(token, selectedEventId, pieceId);
      await loadEventPieces(token, selectedEventId);
      setSuccess('Peca removida do evento.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao remover peca do evento.');
    }
  }

  async function handlePickAssetFile() {
    try {
      const [file] = await pick({
        type: [types.pdf, types.audio, types.images, types.doc],
      });

      setAssetForm((previous) => ({
        ...previous,
        fileUri: file.uri,
        fileName: file.name ?? previous.fileName,
        fileType: file.type ?? previous.fileType,
      }));
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }

      setError(err instanceof Error ? err.message : 'Falha ao escolher ficheiro.');
    }
  }

  async function handlePickDocumentFile() {
    try {
      const [file] = await pick({
        type: [types.pdf, types.doc, types.docx, types.xls, types.xlsx, types.ppt, types.pptx],
      });

      setDocumentForm((previous) => ({
        ...previous,
        fileUri: file.uri,
        fileName: file.name ?? previous.fileName,
        fileType: file.type ?? previous.fileType,
      }));
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }

      setError(err instanceof Error ? err.message : 'Falha ao escolher ficheiro.');
    }
  }

  async function handleOpenSelectedFile(uri: string) {
    if (!uri) {
      return;
    }

    try {
      await Linking.openURL(uri);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nao foi possivel abrir o ficheiro.');
    }
  }

  function handleClearAssetFile() {
    setAssetForm((previous) => ({
      ...previous,
      fileUri: '',
      fileName: '',
      fileType: 'application/pdf',
    }));
  }

  function handleClearDocumentFile() {
    setDocumentForm((previous) => ({
      ...previous,
      fileUri: '',
      fileName: '',
      fileType: 'application/pdf',
    }));
  }

  async function handleUploadAsset() {
    if (!token || !selectedGroupId || !assetForm.fileUri || !assetForm.fileName) {
      return;
    }

    setSubmittingAsset(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('title', assetForm.title.trim());
      formData.append('asset_type', assetForm.assetType.trim());
      if (assetForm.instrument.trim()) {
        formData.append('instrument', assetForm.instrument.trim());
      }
      if (assetForm.eventId) {
        formData.append('event_id', assetForm.eventId);
      }
      if (assetForm.repertoirePieceId) {
        formData.append('repertoire_piece_id', assetForm.repertoirePieceId);
      }
      formData.append('file', {
        uri: assetForm.fileUri,
        name: assetForm.fileName,
        type: assetForm.fileType || 'application/octet-stream',
      } as unknown as Blob);

      await uploadGroupAsset(token, selectedGroupId, formData);
      await loadAssets(token, selectedGroupId);
      setAssetForm(initialAssetForm);
      setSuccess('Partitura/anexo carregado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar partitura.');
    } finally {
      setSubmittingAsset(false);
    }
  }

  async function handleUploadDocument() {
    if (!token || !selectedGroupId || !documentForm.fileUri || !documentForm.fileName) {
      return;
    }

    setSubmittingDocument(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('title', documentForm.title.trim());
      if (documentForm.documentType.trim()) {
        formData.append('document_type', documentForm.documentType.trim());
      }
      if (documentForm.category.trim()) {
        formData.append('category', documentForm.category.trim());
      }
      formData.append('relevance', documentForm.relevance || '0');
      formData.append('file', {
        uri: documentForm.fileUri,
        name: documentForm.fileName,
        type: documentForm.fileType || 'application/octet-stream',
      } as unknown as Blob);

      await uploadGroupDocument(token, selectedGroupId, formData);
      await loadDocuments(token, selectedGroupId);
      setDocumentForm(initialDocumentForm);
      setSuccess('Documento carregado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar documento.');
    } finally {
      setSubmittingDocument(false);
    }
  }

  async function handleRsvp(eventId: number, status: 'yes' | 'no' | 'maybe') {
    if (!token) {
      return;
    }

    setSubmittingRsvpId(eventId);
    setError(null);

    try {
      await setEventRsvp(token, eventId, { status });
      await loadRsvpSummary(token, eventId);
      setSuccess(`RSVP atualizado para ${status}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar RSVP.');
    } finally {
      setSubmittingRsvpId(null);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      {reader && token && <ScoreReader files={reader} token={token} onClose={() => setReader(null)} />}
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <Text style={styles.title}>GesBanda</Text>
            <Text style={styles.subtitle}>{t('Gestão da banda', 'Ensemble management')}</Text>

            {loadingSession ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color="#624278" />
                <Text style={styles.loadingText}>A validar sessao...</Text>
              </View>
            ) : (
              <>
                {error && <Text style={[styles.alert, styles.error]}>{error}</Text>}
                {success && <Text style={[styles.alert, styles.success]}>{success}</Text>}

                {user ? (
                  <View style={styles.form}>
                    <Text style={styles.sectionTitle}>Conta</Text>
                    <Text style={styles.body}>Nome: {user.name}</Text>
                    <Text style={styles.body}>Email: {user.email}</Text>
                    <Text style={styles.body}>Instrumentos: {instrumentsToText(user)}</Text>
                    <Text style={styles.body}>Grupos: {groupsCount}</Text>

                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionTitle}>Grupos</Text>
                      <Pressable
                        style={styles.ghostBtn}
                        onPress={() => token && loadGroups(token)}
                        disabled={loadingGroups}
                      >
                        <Text style={styles.ghostBtnText}>
                          {loadingGroups ? 'A atualizar...' : 'Atualizar'}
                        </Text>
                      </Pressable>
                    </View>

                    {groups.map((group) => (
                      <Pressable
                        key={group.id}
                        style={[styles.item, selectedGroupId === group.id && styles.itemSelected]}
                        onPress={() => setSelectedGroupId(group.id)}
                      >
                        <Text style={styles.itemTitle}>{group.name}</Text>
                        <Text style={styles.itemMeta}>
                          {group.group_type}
                          {group.location ? ` - ${group.location}` : ''}
                        </Text>
                      </Pressable>
                    ))}

                    <Text style={styles.sectionTitle}>Criar grupo</Text>
                    <TextInput
                      placeholder="Nome do grupo"
                      value={groupForm.name}
                      onChangeText={(value) =>
                        setGroupForm((prev) => ({ ...prev, name: value }))
                      }
                      style={styles.input}
                    />
                    <View style={styles.segmentRow}>
                      {groupTypeOptions.map((option) => {
                        const active = option.value === groupForm.groupType;
                        return (
                          <Pressable
                            key={option.value}
                            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                            onPress={() =>
                              setGroupForm((prev) => ({ ...prev, groupType: option.value }))
                            }
                          >
                            <Text
                              style={[
                                styles.segmentBtnText,
                                active && styles.segmentBtnTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      placeholder="Localizacao"
                      value={groupForm.location}
                      onChangeText={(value) =>
                        setGroupForm((prev) => ({ ...prev, location: value }))
                      }
                      style={styles.input}
                    />
                    <Pressable
                      style={[styles.primaryBtn, submittingGroup && styles.disabled]}
                      onPress={handleCreateGroup}
                      disabled={submittingGroup}
                    >
                      <Text style={styles.primaryBtnText}>
                        {submittingGroup ? 'A criar grupo...' : 'Criar grupo'}
                      </Text>
                    </Pressable>

                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionTitle}>Eventos</Text>
                      <Pressable
                        style={styles.ghostBtn}
                        onPress={() => token && selectedGroupId && loadEvents(token, selectedGroupId)}
                        disabled={loadingEvents || !selectedGroupId}
                      >
                        <Text style={styles.ghostBtnText}>
                          {loadingEvents ? 'A atualizar...' : 'Atualizar'}
                        </Text>
                      </Pressable>
                    </View>

                    {!selectedGroupId ? (
                      <Text style={styles.muted}>Seleciona um grupo para gerir eventos.</Text>
                    ) : null}

                    {events.map((eventItem) => (
                      <Pressable
                        key={eventItem.id}
                        style={[styles.item, selectedEventId === eventItem.id && styles.itemSelected]}
                        onPress={() => setSelectedEventId(eventItem.id)}
                      >
                        <Text style={styles.itemTitle}>{eventItem.title}</Text>
                        <Text style={styles.itemMeta}>
                          {eventItem.event_type} - {formatDateTime(eventItem.starts_at)}
                        </Text>
                        <View style={styles.rowSmall}>
                          <Pressable
                            style={styles.ghostBtn}
                            onPress={() => handleRsvp(eventItem.id, 'yes')}
                            disabled={submittingRsvpId === eventItem.id}
                          >
                            <Text style={styles.ghostBtnText}>Sim</Text>
                          </Pressable>
                          <Pressable
                            style={styles.ghostBtn}
                            onPress={() => handleRsvp(eventItem.id, 'no')}
                            disabled={submittingRsvpId === eventItem.id}
                          >
                            <Text style={styles.ghostBtnText}>Nao</Text>
                          </Pressable>
                          <Pressable
                            style={styles.ghostBtn}
                            onPress={() => handleRsvp(eventItem.id, 'maybe')}
                            disabled={submittingRsvpId === eventItem.id}
                          >
                            <Text style={styles.ghostBtnText}>Talvez</Text>
                          </Pressable>
                        </View>
                      </Pressable>
                    ))}

                    {selectedEventId ? (
                      <View style={styles.summaryCard}>
                        <Text style={styles.sectionTitle}>Resumo RSVP</Text>
                        {loadingSummary ? (
                          <Text style={styles.muted}>A carregar resumo...</Text>
                        ) : rsvpSummary ? (
                          <View style={styles.summaryRow}>
                            <Text style={styles.summaryPill}>Sim: {rsvpSummary.yes}</Text>
                            <Text style={styles.summaryPill}>Nao: {rsvpSummary.no}</Text>
                            <Text style={styles.summaryPill}>Talvez: {rsvpSummary.maybe}</Text>
                          </View>
                        ) : (
                          <Text style={styles.muted}>Sem dados de RSVP.</Text>
                        )}
                      </View>
                    ) : null}

                    <Text style={styles.sectionTitle}>Criar evento</Text>
                    <TextInput
                      placeholder="Titulo"
                      value={eventForm.title}
                      onChangeText={(value) =>
                        setEventForm((prev) => ({ ...prev, title: value }))
                      }
                      style={styles.input}
                    />
                    <View style={styles.segmentRow}>
                      {eventTypeOptions.map((option) => {
                        const active = option.value === eventForm.eventType;
                        return (
                          <Pressable
                            key={option.value}
                            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                            onPress={() =>
                              setEventForm((prev) => ({ ...prev, eventType: option.value }))
                            }
                          >
                            <Text
                              style={[
                                styles.segmentBtnText,
                                active && styles.segmentBtnTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      placeholder="Inicio (AAAA-MM-DDTHH:mm)"
                      value={eventForm.startsAt}
                      onChangeText={(value) =>
                        setEventForm((prev) => ({ ...prev, startsAt: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Fim (AAAA-MM-DDTHH:mm)"
                      value={eventForm.endsAt}
                      onChangeText={(value) =>
                        setEventForm((prev) => ({ ...prev, endsAt: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Localizacao"
                      value={eventForm.location}
                      onChangeText={(value) =>
                        setEventForm((prev) => ({ ...prev, location: value }))
                      }
                      style={styles.input}
                    />
                    <Pressable
                      style={[styles.primaryBtn, (submittingEvent || !selectedGroupId) && styles.disabled]}
                      onPress={handleCreateEvent}
                      disabled={submittingEvent || !selectedGroupId}
                    >
                      <Text style={styles.primaryBtnText}>
                        {submittingEvent ? 'A criar evento...' : 'Criar evento'}
                      </Text>
                    </Pressable>

                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionTitle}>Membros</Text>
                      <Pressable
                        style={styles.ghostBtn}
                        onPress={() => token && selectedGroupId && loadMembers(token, selectedGroupId)}
                        disabled={loadingMembers || !selectedGroupId}
                      >
                        <Text style={styles.ghostBtnText}>
                          {loadingMembers ? 'A atualizar...' : 'Atualizar'}
                        </Text>
                      </Pressable>
                    </View>

                    {members.map((member) => (
                      <View key={member.id} style={styles.item}>
                        <Text style={styles.itemTitle}>{member.user?.name ?? 'Sem nome'}</Text>
                        <Text style={styles.itemMeta}>{member.user?.email}</Text>
                        <Text style={styles.itemMeta}>
                          {member.membership_role} - {member.status}
                          {member.section ? ` - ${member.section}` : ''}
                          {member.instrument ? ` - ${member.instrument}` : ''}
                        </Text>
                        <View style={styles.rowSmall}>
                          {member.status !== 'active' ? (
                            <Pressable
                              style={styles.ghostBtn}
                              onPress={() => handleToggleMemberStatus(member, 'active')}
                            >
                              <Text style={styles.ghostBtnText}>Ativar</Text>
                            </Pressable>
                          ) : (
                            <Pressable
                              style={styles.ghostBtn}
                              onPress={() => handleToggleMemberStatus(member, 'inactive')}
                            >
                              <Text style={styles.ghostBtnText}>Inativar</Text>
                            </Pressable>
                          )}
                          <Pressable
                            style={[
                              styles.ghostBtn,
                              member.user_id ===
                                groups.find((group) => group.id === selectedGroupId)?.owner_user_id &&
                                styles.disabled,
                            ]}
                            onPress={() => handleRemoveMember(member)}
                            disabled={
                              member.user_id ===
                              groups.find((group) => group.id === selectedGroupId)?.owner_user_id
                            }
                          >
                            <Text style={styles.ghostBtnText}>Remover</Text>
                          </Pressable>
                        </View>
                      </View>
                    ))}

                    <Text style={styles.sectionTitle}>Convidar membro</Text>
                    <TextInput
                      placeholder="Email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={memberForm.email}
                      onChangeText={(value) =>
                        setMemberForm((prev) => ({ ...prev, email: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Nome"
                      value={memberForm.name}
                      onChangeText={(value) =>
                        setMemberForm((prev) => ({ ...prev, name: value }))
                      }
                      style={styles.input}
                    />
                    <View style={styles.segmentRow}>
                      {[
                        { label: 'Membro', value: 'member' },
                        { label: 'Admin', value: 'admin' },
                        { label: 'Direcao', value: 'board' },
                        { label: 'Maestro', value: 'conductor' },
                      ].map((option) => {
                        const active = option.value === memberForm.membershipRole;
                        return (
                          <Pressable
                            key={option.value}
                            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                            onPress={() =>
                              setMemberForm((prev) => ({
                                ...prev,
                                membershipRole: option.value as MemberForm['membershipRole'],
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.segmentBtnText,
                                active && styles.segmentBtnTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={styles.segmentRow}>
                      {[
                        { label: 'Convidado', value: 'invited' },
                        { label: 'Ativo', value: 'active' },
                        { label: 'Inativo', value: 'inactive' },
                      ].map((option) => {
                        const active = option.value === memberForm.status;
                        return (
                          <Pressable
                            key={option.value}
                            style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                            onPress={() =>
                              setMemberForm((prev) => ({
                                ...prev,
                                status: option.value as MemberForm['status'],
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.segmentBtnText,
                                active && styles.segmentBtnTextActive,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      placeholder="Naipe / Secao"
                      value={memberForm.section}
                      onChangeText={(value) =>
                        setMemberForm((prev) => ({ ...prev, section: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Instrumento"
                      value={memberForm.instrument}
                      onChangeText={(value) =>
                        setMemberForm((prev) => ({ ...prev, instrument: value }))
                      }
                      style={styles.input}
                    />
                    <Pressable
                      style={[styles.primaryBtn, (submittingMember || !selectedGroupId) && styles.disabled]}
                      onPress={handleInviteMember}
                      disabled={submittingMember || !selectedGroupId}
                    >
                      <Text style={styles.primaryBtnText}>
                        {submittingMember ? 'A convidar...' : 'Convidar membro'}
                      </Text>
                    </Pressable>

                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionTitle}>Repertorio</Text>
                      <Pressable
                        style={styles.ghostBtn}
                        onPress={() => token && selectedGroupId && loadPieces(token, selectedGroupId)}
                        disabled={loadingPieces || !selectedGroupId}
                      >
                        <Text style={styles.ghostBtnText}>
                          {loadingPieces ? 'A atualizar...' : 'Atualizar'}
                        </Text>
                      </Pressable>
                    </View>

                    {pieces.map((piece) => (
                      <View key={piece.id} style={styles.item}>
                        <Text style={styles.itemTitle}>{piece.title}</Text>
                        <Text style={styles.itemMeta}>
                          {piece.composer ?? 'Sem compositor'}
                          {piece.difficulty_level ? ` - ${piece.difficulty_level}` : ''}
                        </Text>
                      </View>
                    ))}

                    <Text style={styles.sectionTitle}>Nova peca</Text>
                    <TextInput
                      placeholder="Titulo"
                      value={pieceForm.title}
                      onChangeText={(value) =>
                        setPieceForm((prev) => ({ ...prev, title: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Compositor"
                      value={pieceForm.composer}
                      onChangeText={(value) =>
                        setPieceForm((prev) => ({ ...prev, composer: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Arranjador"
                      value={pieceForm.arranger}
                      onChangeText={(value) =>
                        setPieceForm((prev) => ({ ...prev, arranger: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Dificuldade"
                      value={pieceForm.difficultyLevel}
                      onChangeText={(value) =>
                        setPieceForm((prev) => ({ ...prev, difficultyLevel: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Notas"
                      value={pieceForm.notes}
                      onChangeText={(value) =>
                        setPieceForm((prev) => ({ ...prev, notes: value }))
                      }
                      style={styles.input}
                    />
                    <Pressable
                      style={[styles.primaryBtn, (submittingPiece || !selectedGroupId) && styles.disabled]}
                      onPress={handleCreatePiece}
                      disabled={submittingPiece || !selectedGroupId}
                    >
                      <Text style={styles.primaryBtnText}>
                        {submittingPiece ? 'A criar peca...' : 'Criar peca'}
                      </Text>
                    </Pressable>

                    <Text style={styles.sectionTitle}>Pecas do evento selecionado</Text>
                    {!selectedEventId ? (
                      <Text style={styles.muted}>Seleciona um evento para associar pecas.</Text>
                    ) : (
                      <>
                        <View style={styles.segmentRow}>
                          {pieces.map((piece) => {
                            const active = String(piece.id) === eventPieceForm.repertoirePieceId;
                            return (
                              <Pressable
                                key={piece.id}
                                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                                onPress={() =>
                                  setEventPieceForm((prev) => ({
                                    ...prev,
                                    repertoirePieceId: String(piece.id),
                                  }))
                                }
                              >
                                <Text
                                  style={[
                                    styles.segmentBtnText,
                                    active && styles.segmentBtnTextActive,
                                  ]}
                                >
                                  {piece.title}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <TextInput
                          placeholder="Ordem"
                          keyboardType="number-pad"
                          value={eventPieceForm.pieceOrder}
                          onChangeText={(value) =>
                            setEventPieceForm((prev) => ({ ...prev, pieceOrder: value }))
                          }
                          style={styles.input}
                        />
                        <TextInput
                          placeholder="Notas"
                          value={eventPieceForm.notes}
                          onChangeText={(value) =>
                            setEventPieceForm((prev) => ({ ...prev, notes: value }))
                          }
                          style={styles.input}
                        />
                        <Pressable
                          style={[
                            styles.primaryBtn,
                            (submittingEventPiece || !eventPieceForm.repertoirePieceId) &&
                              styles.disabled,
                          ]}
                          onPress={handleAttachPiece}
                          disabled={submittingEventPiece || !eventPieceForm.repertoirePieceId}
                        >
                          <Text style={styles.primaryBtnText}>
                            {submittingEventPiece ? 'A associar...' : 'Associar ao evento'}
                          </Text>
                        </Pressable>

                        {loadingEventPieces ? (
                          <Text style={styles.muted}>A carregar pecas do evento...</Text>
                        ) : eventPieces.length === 0 ? (
                          <Text style={styles.muted}>Sem pecas associadas.</Text>
                        ) : (
                          eventPieces.map((piece) => (
                            <View key={piece.id} style={styles.item}>
                              <Text style={styles.itemTitle}>{piece.title}</Text>
                              <Text style={styles.itemMeta}>
                                Ordem: {piece.pivot?.piece_order ?? '-'}
                                {piece.pivot?.notes ? ` - ${piece.pivot.notes}` : ''}
                              </Text>
                              <Pressable
                                style={styles.ghostBtn}
                                onPress={() => handleDetachPiece(piece.id)}
                              >
                                <Text style={styles.ghostBtnText}>Remover</Text>
                              </Pressable>
                            </View>
                          ))
                        )}
                      </>
                    )}

                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionTitle}>Partituras</Text>
                      <Pressable
                        style={styles.ghostBtn}
                        onPress={() => token && selectedGroupId && loadAssets(token, selectedGroupId)}
                        disabled={loadingAssets || !selectedGroupId}
                      >
                        <Text style={styles.ghostBtnText}>
                          {loadingAssets ? 'A atualizar...' : 'Atualizar'}
                        </Text>
                      </Pressable>
                    </View>
                    {assets.map((asset) => (
                      <Pressable
                        key={asset.id}
                        style={styles.item}
                        onPress={() => setReader([assetFile(asset)])}
                      >
                        <Text style={styles.itemTitle}>{asset.title}</Text>
                        <Text style={styles.itemMeta}>
                          {asset.asset_type}
                          {asset.instrument ? ` - ${asset.instrument}` : ' - geral'}
                        </Text>
                      </Pressable>
                    ))}
                    <TextInput
                      placeholder="Titulo do ficheiro"
                      value={assetForm.title}
                      onChangeText={(value) =>
                        setAssetForm((prev) => ({ ...prev, title: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Tipo (score, audio, document)"
                      value={assetForm.assetType}
                      onChangeText={(value) =>
                        setAssetForm((prev) => ({ ...prev, assetType: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Instrumento (opcional)"
                      value={assetForm.instrument}
                      onChangeText={(value) =>
                        setAssetForm((prev) => ({ ...prev, instrument: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="ID evento (opcional)"
                      keyboardType="number-pad"
                      value={assetForm.eventId}
                      onChangeText={(value) =>
                        setAssetForm((prev) => ({ ...prev, eventId: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="ID peca (opcional)"
                      keyboardType="number-pad"
                      value={assetForm.repertoirePieceId}
                      onChangeText={(value) =>
                        setAssetForm((prev) => ({ ...prev, repertoirePieceId: value }))
                      }
                      style={styles.input}
                    />
                    <Pressable style={styles.ghostBtn} onPress={handlePickAssetFile}>
                      <Text style={styles.ghostBtnText}>Escolher ficheiro</Text>
                    </Pressable>
                    {assetForm.fileName ? (
                      <View style={styles.fileSelectionRow}>
                        <Text style={styles.itemMeta}>
                          Selecionado: {assetForm.fileName}
                          {assetForm.fileType ? ` (${assetForm.fileType})` : ''}
                        </Text>
                        <Pressable
                          style={styles.ghostBtn}
                          onPress={() => handleOpenSelectedFile(assetForm.fileUri)}
                        >
                          <Text style={styles.ghostBtnText}>Abrir selecionado</Text>
                        </Pressable>
                        <Pressable style={styles.ghostBtn} onPress={handleClearAssetFile}>
                          <Text style={styles.ghostBtnText}>Limpar selecionado</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.muted}>Nenhum ficheiro selecionado.</Text>
                    )}
                    <Pressable
                      style={[
                        styles.primaryBtn,
                        (submittingAsset || !assetForm.fileUri || !assetForm.fileName) &&
                          styles.disabled,
                      ]}
                      onPress={handleUploadAsset}
                      disabled={submittingAsset || !assetForm.fileUri || !assetForm.fileName}
                    >
                      <Text style={styles.primaryBtnText}>
                        {submittingAsset ? 'A carregar...' : 'Carregar partitura/anexo'}
                      </Text>
                    </Pressable>

                    <View style={styles.rowBetween}>
                      <Text style={styles.sectionTitle}>Documentos</Text>
                      <Pressable
                        style={styles.ghostBtn}
                        onPress={() => token && selectedGroupId && loadDocuments(token, selectedGroupId)}
                        disabled={loadingDocuments || !selectedGroupId}
                      >
                        <Text style={styles.ghostBtnText}>
                          {loadingDocuments ? 'A atualizar...' : 'Atualizar'}
                        </Text>
                      </Pressable>
                    </View>
                    {documents.map((documentItem) => (
                      <Pressable
                        key={documentItem.id}
                        style={styles.item}
                        onPress={() => setReader([documentFile(documentItem)])}
                      >
                        <Text style={styles.itemTitle}>{documentItem.title}</Text>
                        <Text style={styles.itemMeta}>
                          {documentItem.document_type ?? 'documento'}
                          {documentItem.category ? ` - ${documentItem.category}` : ''}
                        </Text>
                      </Pressable>
                    ))}
                    <TextInput
                      placeholder="Titulo do documento"
                      value={documentForm.title}
                      onChangeText={(value) =>
                        setDocumentForm((prev) => ({ ...prev, title: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Tipo"
                      value={documentForm.documentType}
                      onChangeText={(value) =>
                        setDocumentForm((prev) => ({ ...prev, documentType: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Categoria"
                      value={documentForm.category}
                      onChangeText={(value) =>
                        setDocumentForm((prev) => ({ ...prev, category: value }))
                      }
                      style={styles.input}
                    />
                    <TextInput
                      placeholder="Relevancia (0-10)"
                      keyboardType="number-pad"
                      value={documentForm.relevance}
                      onChangeText={(value) =>
                        setDocumentForm((prev) => ({ ...prev, relevance: value }))
                      }
                      style={styles.input}
                    />
                    <Pressable style={styles.ghostBtn} onPress={handlePickDocumentFile}>
                      <Text style={styles.ghostBtnText}>Escolher ficheiro</Text>
                    </Pressable>
                    {documentForm.fileName ? (
                      <View style={styles.fileSelectionRow}>
                        <Text style={styles.itemMeta}>
                          Selecionado: {documentForm.fileName}
                          {documentForm.fileType ? ` (${documentForm.fileType})` : ''}
                        </Text>
                        <Pressable
                          style={styles.ghostBtn}
                          onPress={() => handleOpenSelectedFile(documentForm.fileUri)}
                        >
                          <Text style={styles.ghostBtnText}>Abrir selecionado</Text>
                        </Pressable>
                        <Pressable style={styles.ghostBtn} onPress={handleClearDocumentFile}>
                          <Text style={styles.ghostBtnText}>Limpar selecionado</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Text style={styles.muted}>Nenhum ficheiro selecionado.</Text>
                    )}
                    <Pressable
                      style={[
                        styles.primaryBtn,
                        (submittingDocument || !documentForm.fileUri || !documentForm.fileName) &&
                          styles.disabled,
                      ]}
                      onPress={handleUploadDocument}
                      disabled={
                        submittingDocument || !documentForm.fileUri || !documentForm.fileName
                      }
                    >
                      <Text style={styles.primaryBtnText}>
                        {submittingDocument ? 'A carregar...' : 'Carregar documento'}
                      </Text>
                    </Pressable>

                    <Pressable style={styles.secondaryBtn} onPress={onSignOut}>
                      <Text style={styles.secondaryBtnText}>Terminar sessao</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.form}>
                    <View style={styles.modeRow}>
                      <Pressable
                        style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                        onPress={() => setMode('login')}
                      >
                        <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                          Entrar
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
                        onPress={() => setMode('register')}
                      >
                        <Text
                          style={[
                            styles.modeBtnText,
                            mode === 'register' && styles.modeBtnTextActive,
                          ]}
                        >
                          Criar conta
                        </Text>
                      </Pressable>
                    </View>

                    {mode === 'login' ? (
                      <>
                        <TextInput
                          placeholder="Email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={loginForm.email}
                          onChangeText={(value) =>
                            setLoginForm((prev) => ({ ...prev, email: value }))
                          }
                          style={styles.input}
                        />
                        <TextInput
                          placeholder="Password"
                          secureTextEntry
                          value={loginForm.password}
                          onChangeText={(value) =>
                            setLoginForm((prev) => ({ ...prev, password: value }))
                          }
                          style={styles.input}
                        />
                        <Pressable
                          style={[styles.primaryBtn, submitting && styles.disabled]}
                          onPress={handleLogin}
                          disabled={submitting}
                        >
                          <Text style={styles.primaryBtnText}>
                            {submitting ? 'A entrar...' : 'Entrar'}
                          </Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <TextInput
                          placeholder="Nome"
                          value={registerForm.firstName}
                          onChangeText={(value) =>
                            setRegisterForm((prev) => ({ ...prev, firstName: value }))
                          }
                          style={styles.input}
                        />
                        <TextInput
                          placeholder="Apelido"
                          value={registerForm.lastName}
                          onChangeText={(value) =>
                            setRegisterForm((prev) => ({ ...prev, lastName: value }))
                          }
                          style={styles.input}
                        />
                        <TextInput
                          placeholder="Email"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={registerForm.email}
                          onChangeText={(value) =>
                            setRegisterForm((prev) => ({ ...prev, email: value }))
                          }
                          style={styles.input}
                        />
                        <TextInput
                          placeholder="Password"
                          secureTextEntry
                          value={registerForm.password}
                          onChangeText={(value) =>
                            setRegisterForm((prev) => ({ ...prev, password: value }))
                          }
                          style={styles.input}
                        />
                        <TextInput
                          placeholder="Confirmar password"
                          secureTextEntry
                          value={registerForm.passwordConfirmation}
                          onChangeText={(value) =>
                            setRegisterForm((prev) => ({
                              ...prev,
                              passwordConfirmation: value,
                            }))
                          }
                          style={styles.input}
                        />
                        <Pressable
                          style={[styles.primaryBtn, submitting && styles.disabled]}
                          onPress={handleRegister}
                          disabled={submitting}
                        >
                          <Text style={styles.primaryBtnText}>
                            {submitting ? 'A criar conta...' : 'Criar conta'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f2edf5' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#10243c', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#3d5878', marginBottom: 16 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loadingText: { color: '#17385c' },
  form: { gap: 10 },
  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c2d2e5',
    backgroundColor: '#f7fbff',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: '#624278', borderColor: '#624278' },
  modeBtnText: { color: '#624278', fontWeight: '600' },
  modeBtnTextActive: { color: '#ffffff' },
  input: {
    borderWidth: 1,
    borderColor: '#c2d2e5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#624278',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700' },
  secondaryBtn: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#c2d2e5',
    backgroundColor: '#f7fbff',
  },
  secondaryBtnText: { color: '#624278', fontWeight: '600' },
  disabled: { opacity: 0.65 },
  alert: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    fontWeight: '600',
  },
  error: { backgroundColor: '#fee4e2', color: '#b42318' },
  success: { backgroundColor: '#dcfae6', color: '#067647' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#10243c', marginTop: 8 },
  body: { color: '#17385c', fontSize: 14 },
  muted: { color: '#3d5878' },
  rowBetween: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowSmall: { flexDirection: 'row', gap: 8, marginTop: 6 },
  fileSelectionRow: { gap: 8 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: '#c2d2e5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#f7fbff',
  },
  ghostBtnText: { color: '#624278', fontWeight: '600', fontSize: 12 },
  item: {
    borderWidth: 1,
    borderColor: '#d8e4f0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#ffffff',
    marginTop: 6,
  },
  itemSelected: { borderColor: '#624278', backgroundColor: '#f2edf5' },
  itemTitle: { color: '#10243c', fontWeight: '700' },
  itemMeta: { color: '#3d5878', fontSize: 12, marginTop: 2 },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  segmentBtn: {
    borderWidth: 1,
    borderColor: '#c2d2e5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#f7fbff',
  },
  segmentBtnActive: { borderColor: '#624278', backgroundColor: '#624278' },
  segmentBtnText: { color: '#624278', fontSize: 12, fontWeight: '600' },
  segmentBtnTextActive: { color: '#ffffff' },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#d8e4f0',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#f7fbff',
    marginTop: 6,
  },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  summaryPill: {
    borderWidth: 1,
    borderColor: '#c2d2e5',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#624278',
    fontWeight: '600',
    fontSize: 12,
    backgroundColor: '#ffffff',
  },
});
