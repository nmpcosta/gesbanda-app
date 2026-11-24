import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { setEventRsvp } from './auth';
import { Button, Card, ui, useWords } from './mobileUI';
import { assetFile, isScore, type MusicFile } from './ScoreReader';
import { RehearsalAttendance } from './RehearsalAttendance';
import { StageMap, type StagePlan } from './StageMap';
import { useMobileResource } from './useMobileResource';
import type {
  EventSummary,
  EventRsvpsResponse,
  GroupAssetSummary,
  RepertoirePieceSummary,
} from './types';

export function eventScores(
  pieces: RepertoirePieceSummary[],
  assets: GroupAssetSummary[],
  eventId: number,
  choices: Record<number, number> = {},
  instruments: string[] = [],
) {
  const eligible = assets.filter(
    a => isScore(a) && (a.event_id === null || a.event_id === eventId),
  );
  const ordered = pieces.flatMap(piece => {
    const parts = eligible.filter(a => a.repertoire_piece_id === piece.id);
    const chosen =
      parts.find(a => a.id === choices[piece.id]) ??
      parts.find(a => a.instrument && instruments.includes(a.instrument)) ??
      parts.find(a => !a.instrument) ??
      parts[0];
    return chosen
      ? [{ ...assetFile(chosen), title: chosen.title.toLowerCase().startsWith(piece.title.toLowerCase()) ? chosen.title : piece.title + ' · ' + chosen.title }]
      : [];
  });
  const extra = eligible
    .filter(
      a =>
        a.event_id === eventId &&
        !pieces.some(p => p.id === a.repertoire_piece_id),
    )
    .map(assetFile);
  return [...ordered, ...extra];
}
export function MusicianEvent({
  event,
  token,
  userId,
  assets,
  plans,
  memberId,
  instruments,
  onRead,
  onBack,
}: {
  event: EventSummary;
  token: string;
  userId: number;
  assets: GroupAssetSummary[];
  plans: StagePlan[];
  memberId?: number;
  instruments: string[];
  onRead: (files: MusicFile[]) => void;
  onBack: () => void;
}) {
  const t = useWords();
  const pieces = useMobileResource<{ data: RepertoirePieceSummary[] }>(
    '/events/' + event.id + '/pieces',
    token,
  );
  const rsvp = useMobileResource<EventRsvpsResponse>(
    '/events/' + event.id + '/rsvps',
    token,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showPlan, setShowPlan] = useState(false);
  const selected = rsvp.data?.data.find(r => r.user_id === userId)?.status;
  const [choices, setChoices] = useState<Record<number, number>>({});
  const scores = eventScores(
    pieces.data?.data ?? [],
    assets,
    event.id,
    choices,
    instruments,
  );
  const eventPlans = plans.filter(p => p.event_id === event.id);
  const availablePlans = [
    ...eventPlans,
    ...plans.filter(p => p.event_id === null),
  ];
  const date = (v: string) => new Date(v).toLocaleString(t('pt-PT', 'en-GB'));
  const open = event.status === 'published';
  async function reply(value: 'yes' | 'no' | 'maybe') {
    setBusy(true);
    setError('');
    try {
      await setEventRsvp(token, event.id, { status: value });
      rsvp.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button onPress={onBack}>
        {t('Voltar à agenda', 'Back to schedule')}
      </Button>
      <Text accessibilityRole="header" style={ui.heading}>
        {event.title}
      </Text>
      <Text style={ui.text}>
        {date(event.starts_at)}
        {event.ends_at ? ' – ' + date(event.ends_at) : ''}
        {event.location ? ' · ' + event.location : ''}
      </Text>
      {!!event.description && <Text style={ui.text}>{event.description}</Text>}
      <View style={ui.row}>
        <Button
          primary
          disabled={!scores.length || pieces.loading}
          onPress={() => onRead(scores)}
        >
          {t('Modo de palco · Abrir pautas', 'Live mode · Open scores')}
        </Button>
        <Button
          disabled={!availablePlans.length}
          onPress={() => setShowPlan(!showPlan)}
        >
          {t('Planta de palco', 'Stage plan')}
        </Button>
      </View>
      {showPlan && <StageMap plans={availablePlans} memberId={memberId} />}
      <Card title={t('Disponibilidade', 'Availability')}>
        {open ? (
          <View style={ui.row}>
            {(['yes', 'no', 'maybe'] as const).map((v, i) => (
              <Button
                key={v}
                selected={selected === v}
                disabled={busy || rsvp.loading}
                onPress={() => void reply(v)}
              >
                {
                  [
                    t('Vou', 'Going'),
                    t('Não vou', 'Not going'),
                    t('Talvez', 'Maybe'),
                  ][i]
                }
              </Button>
            ))}
          </View>
        ) : (
          <Text>
            {event.status === 'cancelled'
              ? t('Evento cancelado', 'Event cancelled')
              : t('Convocatória fechada', 'RSVP closed')}
          </Text>
        )}
        {!!(error || rsvp.error) && (
          <Text style={ui.error}>{error || rsvp.error}</Text>
        )}
      </Card>
      <RehearsalAttendance
        eventId={event.id}
        token={token}
        userId={userId}
        open={open}
      />
      <Card title={t('Repertório do evento', 'Event programme')}>
        {!!pieces.error && (
          <>
            <Text style={ui.error}>{pieces.error}</Text>
            <Button onPress={pieces.refresh}>
              {t('Tentar novamente', 'Retry')}
            </Button>
          </>
        )}
        {pieces.data?.data.length === 0 && (
          <Text style={ui.muted}>
            {t('Sem peças associadas.', 'No pieces linked.')}
          </Text>
        )}
        {pieces.data?.data.map((p, i) => {
          const files = assets.filter(
            a =>
              a.repertoire_piece_id === p.id &&
              (!a.event_id || a.event_id === event.id) &&
              isScore(a),
          );
          return (
            <View key={p.id} style={{ gap: 6 }}>
              <Text style={ui.title}>
                {i + 1}. {p.title}
              </Text>
              {!!p.pivot?.notes && (
                <Text style={ui.muted}>{p.pivot.notes}</Text>
              )}
              {files.length ? (
                files.map(a => (
                  <View key={a.id} style={ui.row}>
                    <Button onPress={() => onRead([assetFile(a)])}>
                      {a.title}
                    </Button>
                    {files.length > 1 && (
                      <Button
                        selected={scores.some(
                          s => s.path === assetFile(a).path,
                        )}
                        onPress={() =>
                          setChoices(old => ({ ...old, [p.id]: a.id }))
                        }
                      >
                        {t('Usar em palco', 'Use live')}
                      </Button>
                    )}
                  </View>
                ))
              ) : (
                <Text style={ui.muted}>
                  {t('Sem pauta PDF disponível.', 'No PDF score available.')}
                </Text>
              )}
            </View>
          );
        })}
        {assets
          .filter(
            a =>
              a.event_id === event.id &&
              !(pieces.data?.data ?? []).some(
                p => p.id === a.repertoire_piece_id,
              ),
          )
          .map(a => (
            <Button key={a.id} onPress={() => onRead([assetFile(a)])}>
              {a.title}
            </Button>
          ))}
      </Card>
    </>
  );
}
