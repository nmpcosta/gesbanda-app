import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api';
import { BrandMark, Button, Card, ui, useWords } from './mobileUI';
import {
  assetFile,
  documentFile,
  isScore,
  ScoreReader,
  type MusicFile,
} from './ScoreReader';
import { StageMap, type StagePlan } from './StageMap';
import { MobileCommunications } from './MobileCommunications';
import { MusicianEvent } from './MusicianEvent';
import { useMobileResource } from './useMobileResource';
import type {
  AuthResponse,
  EventSummary,
  GroupSummary,
  GroupAssetSummary,
  GroupDocumentSummary,
  GroupMemberSummary,
  RepertoirePieceSummary,
} from './types';

type Props = {
  session: AuthResponse;
  onLogout: () => void;
  onLanguage: () => void;
  onManage: () => void;
};
type Tab = 'agenda' | 'music' | 'news' | 'more';
type More = 'menu' | 'archive' | 'members' | 'stage';

export function MusicianHome({
  session,
  onLogout,
  onLanguage,
  onManage,
}: Props) {
  const t = useWords();
  const groups = useMobileResource<{ data: GroupSummary[] }>(
    '/groups',
    session.token,
  );
  const [id, setId] = useState<number | null>(null);
  const [picker, setPicker] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const key = 'gesbanda.band.' + session.user.id;
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(key)
      .then(v => {
        if (active && v) setId(Number(v));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [key]);
  const group =
    groups.data?.data.find(g => g.id === id) ?? groups.data?.data[0];
  const normalized = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  function choose(g: GroupSummary) {
    setId(g.id);
    setPicker(false);
    setError('');
    void AsyncStorage.setItem(key, String(g.id));
  }
  return (
    <View style={ui.root}>
      <Pressable
        style={ui.header}
        accessibilityRole="button"
        accessibilityLabel={t('Mudar de banda', 'Switch ensemble')}
        onPress={() => {
          setQuery('');
          setPicker(true);
        }}
      >
        <View style={ui.identity}>
          <BrandMark />
          <View style={ui.identityText}>
            <Text style={ui.brand}>GesBanda</Text>
            <Text numberOfLines={2} style={ui.band}>
              {group?.name ?? t('Escolher banda', 'Choose ensemble')}
            </Text>
          </View>
          {!!group?.color && (
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: group.color,
                borderColor: 'white',
                borderWidth: 1,
              }}
            />
          )}
          <Text style={ui.inverse}>▾</Text>
        </View>
      </Pressable>
      {picker && (
        <Modal visible onRequestClose={() => setPicker(false)}>
          <SafeAreaView style={ui.root}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={ui.body}
            >
              <Text style={ui.heading}>
                {t('As minhas bandas', 'My ensembles')}
              </Text>
              <TextInput
                style={ui.input}
                placeholder={t(
                  'Pesquisar banda ou localidade',
                  'Search ensemble or location',
                )}
                value={query}
                onChangeText={setQuery}
              />
              {groups.data?.data
                .filter(g =>
                  normalized(g.name + ' ' + (g.location ?? '')).includes(
                    normalized(query),
                  ),
                )
                .map(g => (
                  <Button
                    key={g.id}
                    selected={g.id === group?.id}
                    onPress={() => choose(g)}
                  >
                    {g.name +
                      (g.location ? ' · ' + g.location : '') +
                      (g.membership_status === 'invited'
                        ? t(' · Convite', ' · Invitation')
                        : '')}
                  </Button>
                ))}
              <Button onPress={groups.refresh}>
                {t('Atualizar', 'Refresh')}
              </Button>
              <Button onPress={() => setPicker(false)}>
                {t('Fechar', 'Close')}
              </Button>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
      {groups.error ? (
        <View style={ui.body}>
          <Text style={ui.error}>{groups.error}</Text>
          <Button onPress={groups.refresh}>
            {t('Tentar novamente', 'Retry')}
          </Button>
        </View>
      ) : null}
      {group && group.membership_status !== 'invited' ? (
        <BandSpace
          key={group.id}
          group={group}
          session={session}
          onLogout={onLogout}
          onLanguage={onLanguage}
          onManage={onManage}
        />
      ) : (
        <View style={ui.body}>
          {groups.loading ? (
            <ActivityIndicator />
          ) : group ? (
            <Card title={t('Convite para a banda', 'Ensemble invitation')}>
              <Button
                primary
                disabled={accepting}
                onPress={async () => {
                  setAccepting(true);
                  setError('');
                  try {
                    await apiRequest(
                      '/groups/' + group.id + '/accept-invitation',
                      { method: 'POST' },
                      session.token,
                    );
                    groups.refresh();
                  } catch (err) {
                    setError(String(err));
                  } finally {
                    setAccepting(false);
                  }
                }}
              >
                {t('Aceitar convite', 'Accept invitation')}
              </Button>
            </Card>
          ) : (
            <Card title={t('A tua primeira banda', 'Your first ensemble')}>
              <Text style={ui.muted}>
                {t(
                  'Indica o email da tua conta à direção para receberes um convite.',
                  'Give the ensemble manager your account email to receive an invitation.',
                )}
              </Text>
              <Button onPress={onManage}>
                {t('Criar uma banda', 'Create an ensemble')}
              </Button>
              <Button onPress={groups.refresh}>
                {t('Procurar convites', 'Check invitations')}
              </Button>
            </Card>
          )}
          {!!error && <Text style={ui.error}>{error}</Text>}
          <Button onPress={onLanguage}>{t('English', 'Português')}</Button>
          <Button onPress={onLogout}>{t('Terminar sessão', 'Sign out')}</Button>
        </View>
      )}
    </View>
  );
}

function BandSpace({
  group,
  session,
  onLogout,
  onLanguage,
  onManage,
}: Props & { group: GroupSummary }) {
  const t = useWords();
  const [tab, setTab] = useState<Tab>('agenda');
  const [more, setMore] = useState<More>('menu');
  const [eventId, setEventId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [past, setPast] = useState(false);
  const [reader, setReader] = useState<MusicFile[] | null>(null);
  const scroll = useRef<ScrollView>(null);
  const token = session.token;
  const path = '/groups/' + group.id;
  const events = useMobileResource<{ data: EventSummary[] }>(
    path + '/events',
    token,
  );
  const assets = useMobileResource<{ data: GroupAssetSummary[] }>(
    tab === 'music' || eventId !== null || more === 'archive'
      ? path + '/assets'
      : null,
    token,
  );
  const documents = useMobileResource<{ data: GroupDocumentSummary[] }>(
    more === 'archive' ? path + '/documents' : null,
    token,
  );
  const members = useMobileResource<{ data: GroupMemberSummary[] }>(
    more === 'members' || more === 'stage' || eventId !== null
      ? path + '/members'
      : null,
    token,
  );
  const pieces = useMobileResource<{ data: RepertoirePieceSummary[] }>(
    tab === 'music' ? path + '/pieces' : null,
    token,
  );
  const plans = useMobileResource<{ data: StagePlan[] }>(
    more === 'stage' || eventId !== null ? path + '/stage-plans' : null,
    token,
  );
  const reminders = useMobileResource<{
    data: { id: number; group_id: number; event_id: number; title: string }[];
  }>(tab === 'agenda' ? '/reminders' : null, token);
  const event = events.data?.data.find(e => e.id === eventId);
  const member = members.data?.data.find(m => m.user_id === session.user.id);
  const matching = (value: string) =>
    value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase());
  const listed = (events.data?.data ?? []).filter(
    e =>
      e.status !== 'draft' &&
      (past
        ? Date.parse(e.ends_at ?? e.starts_at) < Date.now()
        : Date.parse(e.ends_at ?? e.starts_at) >= Date.now() ||
          (!e.ends_at &&
            new Date(e.starts_at).toDateString() ===
              new Date().toDateString())),
  );
  if (past) listed.reverse();
  const nextEvent = !past
    ? listed.find(e => e.status === 'published')
    : undefined;
  const pending =
    reminders.data?.data.filter(r => r.group_id === group.id) ?? [];
  const date = (v: string) =>
    new Date(v).toLocaleString(t('pt-PT', 'en-GB'), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  const tabs: { key: Tab; title: string }[] = [
    { key: 'agenda', title: t('Agenda', 'Schedule') },
    { key: 'music', title: t('Repertório', 'Repertoire') },
    { key: 'news', title: t('Avisos', 'Notices') },
    { key: 'more', title: t('Mais', 'More') },
  ];
  const labels: Record<More, string> = {
    menu: t('Mais', 'More'),
    archive: t('Arquivo', 'Archive'),
    members: t('Membros da banda', 'Ensemble members'),
    stage: t('Plantas de palco', 'Stage plans'),
  };
  function go(next: Tab) {
    setTab(next);
    setEventId(null);
    setMore('menu');
    setSearch('');
  }
  function nextMore(value: More) {
    setMore(value);
    setSearch('');
  }
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [tab, eventId, more]);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (eventId !== null) {
        setEventId(null);
        return true;
      }
      if (more !== 'menu') {
        nextMore('menu');
        return true;
      }
      if (tab !== 'agenda') {
        go('agenda');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [tab, eventId, more]);
  const resources = [
    events,
    assets,
    documents,
    members,
    pieces,
    plans,
    reminders,
  ];
  const relevant =
    tab === 'agenda'
      ? event
        ? [events, assets, members, plans]
        : [events, reminders]
      : tab === 'music'
      ? [pieces, assets]
      : more === 'archive'
      ? [assets, documents]
      : more === 'members'
      ? [members]
      : more === 'stage'
      ? [members, plans]
      : [];
  const issue = relevant.find(r => r.error);
  function refresh() {
    resources.forEach(r => r.refresh());
  }
  const searchBox = (
    <TextInput
      accessibilityLabel={t('Pesquisar', 'Search')}
      style={ui.input}
      placeholder={t('Pesquisar', 'Search')}
      value={search}
      onChangeText={setSearch}
    />
  );
  return (
    <View style={ui.root}>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={ui.body}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={refresh} />
        }
      >
        {issue && (
          <Card>
            <Text style={ui.error}>{issue.error}</Text>
            <Button onPress={refresh}>{t('Tentar novamente', 'Retry')}</Button>
          </Card>
        )}
        {relevant.some(r => r.loading) && <ActivityIndicator />}
        {tab === 'agenda' &&
          (event ? (
            <MusicianEvent
              key={event.id}
              event={event}
              token={token}
              userId={session.user.id}
              assets={assets.data?.data ?? []}
              plans={plans.data?.data ?? []}
              memberId={member?.id}
              instruments={
                member?.instruments ??
                (member?.instrument ? [member.instrument] : [])
              }
              onRead={setReader}
              onBack={() => {
                setEventId(null);
                reminders.refresh();
              }}
            />
          ) : (
            <>
              <Text style={ui.heading}>{t('Agenda', 'Schedule')}</Text>
              <View style={ui.row}>
                <Button selected={!past} onPress={() => setPast(false)}>
                  {t('Próximos', 'Upcoming')}
                </Button>
                <Button selected={past} onPress={() => setPast(true)}>
                  {t('Anteriores', 'Past')}
                </Button>
              </View>
              {pending.length > 0 && (
                <Card title={t('Por responder', 'Awaiting your reply')}>
                  {pending.map(r => (
                    <Button key={r.id} onPress={() => setEventId(r.event_id)}>
                      {r.title}
                    </Button>
                  ))}
                </Card>
              )}
              {listed.length === 0 && !events.loading && (
                <Text style={ui.muted}>
                  {t('Sem eventos neste período.', 'No events in this period.')}
                </Text>
              )}
              {nextEvent && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setEventId(nextEvent.id)}
                  style={ui.hero}
                >
                  <Text style={ui.heroTag}>
                    {nextEvent.event_type === 'rehearsal'
                      ? t('Próximo ensaio', 'Next rehearsal')
                      : nextEvent.event_type === 'concert'
                      ? t('Próximo concerto', 'Next concert')
                      : t('Próximo evento', 'Next event')}
                  </Text>
                  <Text style={ui.heroTitle}>{nextEvent.title}</Text>
                  <Text style={ui.heroDetail}>
                    {date(nextEvent.starts_at)}
                    {nextEvent.location ? ' · ' + nextEvent.location : ''}
                  </Text>
                  <Text style={ui.heroTag}>
                    {t('Abrir evento  →', 'Open event  →')}
                  </Text>
                </Pressable>
              )}
              {listed
                .filter(e => e.id !== nextEvent?.id)
                .map(e => (
                  <Pressable
                    key={e.id}
                    accessibilityRole="button"
                    onPress={() => setEventId(e.id)}
                    style={ui.card}
                  >
                    <Text style={ui.muted}>
                      {date(e.starts_at)}
                      {e.status === 'cancelled'
                        ? t(' · Cancelado', ' · Cancelled')
                        : ''}
                    </Text>
                    <Text style={ui.title}>{e.title}</Text>
                    {!!e.location && <Text style={ui.text}>{e.location}</Text>}
                  </Pressable>
                ))}
            </>
          ))}
        {tab === 'music' && (
          <>
            <Text style={ui.heading}>{t('Repertório', 'Repertoire')}</Text>
            {searchBox}
            {pieces.data?.data
              .filter(p => matching(p.title + ' ' + (p.composer ?? '')))
              .map(p => (
                <Card key={p.id} title={p.title}>
                  {!!p.composer && <Text style={ui.muted}>{p.composer}</Text>}
                  {(assets.data?.data ?? [])
                    .filter(a => a.repertoire_piece_id === p.id && isScore(a))
                    .map(a => (
                      <Button
                        key={a.id}
                        onPress={() => setReader([assetFile(a)])}
                      >
                        {a.title + (a.instrument ? ' · ' + a.instrument : '')}
                      </Button>
                    ))}
                  {assets.data &&
                    !assets.data.data.some(
                      a => a.repertoire_piece_id === p.id && isScore(a),
                    ) && (
                      <Text style={ui.muted}>
                        {t(
                          'Sem pauta PDF disponível.',
                          'No PDF score available.',
                        )}
                      </Text>
                    )}
                </Card>
              ))}
            {pieces.data &&
              !pieces.data.data.some(p =>
                matching(p.title + ' ' + (p.composer ?? '')),
              ) && (
                <Text>{t('Nenhuma peça encontrada.', 'No pieces found.')}</Text>
              )}
          </>
        )}
        {tab === 'news' && (
          <>
            <Text style={ui.heading}>
              {t('Comunicações', 'Communications')}
            </Text>
            <MobileCommunications groupId={group.id} token={token} />
          </>
        )}
        {tab === 'more' && (
          <>
            <Text style={ui.heading}>{labels[more]}</Text>
            {more === 'menu' ? (
              <>
                <Card>
                  {(['archive', 'stage', 'members'] as const).map(k => (
                    <Button key={k} onPress={() => nextMore(k)}>
                      {labels[k]}
                    </Button>
                  ))}
                </Card>
                <Card title={session.user.name}>
                  <Button onPress={onLanguage}>
                    {t('English', 'Português')}
                  </Button>
                  {(group.can_manage ||
                    group.owner_user_id === session.user.id) && (
                    <Button onPress={onManage}>
                      {t('Gestão da banda', 'Ensemble management')}
                    </Button>
                  )}
                  <Button onPress={onLogout}>
                    {t('Terminar sessão', 'Sign out')}
                  </Button>
                </Card>
              </>
            ) : (
              <Button onPress={() => nextMore('menu')}>
                {t('Voltar', 'Back')}
              </Button>
            )}
            {more === 'members' && (
              <>
                {searchBox}
                {members.data?.data
                  .filter(
                    m =>
                      m.status === 'active' &&
                      matching(
                        [
                          m.user?.name,
                          ...(m.sections ?? [m.section]),
                          ...(m.instruments ?? [m.instrument]),
                        ].join(' '),
                      ),
                  )
                  .map(m => (
                    <Card key={m.id} title={m.user?.name}>
                      <Text style={ui.muted}>
                        {[
                          ...(m.sections ?? [m.section]),
                          ...(m.instruments ?? [m.instrument]),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                    </Card>
                  ))}
              </>
            )}
            {more === 'archive' && (
              <>
                {searchBox}
                {[
                  ...(documents.data?.data.map(documentFile) ?? []),
                  ...(assets.data?.data.map(assetFile) ?? []),
                ]
                  .filter(f => matching(f.title))
                  .map(f => (
                    <Button key={f.path} onPress={() => setReader([f])}>
                      {f.title}
                    </Button>
                  ))}
                {documents.data &&
                  assets.data &&
                  ![...documents.data.data, ...assets.data.data].some(f =>
                    matching(f.title),
                  ) && (
                    <Text>
                      {t('Nenhum ficheiro encontrado.', 'No files found.')}
                    </Text>
                  )}
              </>
            )}
            {more === 'stage' && plans.data && (
              <StageMap plans={plans.data.data} memberId={member?.id} />
            )}
          </>
        )}
      </ScrollView>
      <View style={ui.nav}>
        {tabs.map(item => (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.key }}
            onPress={() => go(item.key)}
            style={[ui.tab, tab === item.key && ui.tabActive]}
          >
            <Text style={ui.tabText}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
      {reader && (
        <ScoreReader
          files={reader}
          token={token}
          onClose={() => setReader(null)}
        />
      )}
    </View>
  );
}
