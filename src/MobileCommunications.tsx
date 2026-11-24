import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { apiRequest } from './api';
import { Button, Card, ui, useWords } from './mobileUI';
import { useMobileResource } from './useMobileResource';

type Notice = {
  id: number;
  title: string;
  body: string;
  is_pinned: boolean;
  comments: { id: number; body: string; user?: { name: string } }[];
};
type Poll = {
  id: number;
  title: string;
  description: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  questions: {
    id: number;
    prompt: string;
    options: { id: number; label: string }[];
    responses: { poll_option_id: number }[];
  }[];
};
type Page<T> = { data: T[]; last_page: number };
export function MobileCommunications({
  token,
  groupId,
}: {
  token: string;
  groupId: number;
}) {
  const t = useWords();
  const [polls, setPolls] = useState(false);
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const path = '/groups/' + groupId;
  const resource = useMobileResource<{
    announcements: Page<Notice>;
    polls: Page<Poll>;
  }>(
    path +
      '/communication?' +
      (polls ? 'polls_page' : 'announcements_page') +
      '=' +
      page,
    token,
  );
  async function send(relative: string, method: string, body: object) {
    setBusy(true);
    setError('');
    try {
      await apiRequest(
        path + relative,
        { method, body: JSON.stringify(body) },
        token,
      );
      resource.refresh();
      return true;
    } catch (err) {
      setError(String(err));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const pages = polls ? resource.data?.polls : resource.data?.announcements;
  return (
    <>
      <View style={ui.row}>
        <Button
          selected={!polls}
          onPress={() => {
            setPolls(false);
            setPage(1);
          }}
        >
          {t('Avisos', 'Notices')}
        </Button>
        <Button
          selected={polls}
          onPress={() => {
            setPolls(true);
            setPage(1);
          }}
        >
          {t('Inquéritos', 'Polls')}
        </Button>
        <Button onPress={resource.refresh}>{t('Atualizar', 'Refresh')}</Button>
      </View>
      {!!(error || resource.error) && (
        <Text style={ui.error}>{error || resource.error}</Text>
      )}
      {resource.loading && <Text>{t('A carregar…', 'Loading…')}</Text>}
      {pages?.data.length === 0 && (
        <Text style={ui.muted}>{t('Sem publicações.', 'No posts yet.')}</Text>
      )}
      {!polls &&
        resource.data?.announcements.data.map(n => (
          <Card key={n.id} title={n.title}>
            {n.is_pinned && (
              <Text style={ui.muted}>{t('Fixado', 'Pinned')}</Text>
            )}
            <Text style={ui.text}>{n.body}</Text>
            {n.comments.map(c => (
              <Text key={c.id} style={ui.muted}>
                {c.user?.name} · {c.body}
              </Text>
            ))}
            <TextInput
              style={ui.input}
              placeholder={t('Escrever comentário', 'Write a comment')}
              value={draft[n.id] ?? ''}
              onChangeText={v => setDraft(old => ({ ...old, [n.id]: v }))}
              maxLength={3000}
            />
            <Button
              disabled={busy || !draft[n.id]?.trim()}
              onPress={async () => {
                if (
                  await send('/announcements/' + n.id + '/comments', 'POST', {
                    body: draft[n.id].trim(),
                  })
                )
                  setDraft(old => ({ ...old, [n.id]: '' }));
              }}
            >
              {t('Comentar', 'Comment')}
            </Button>
          </Card>
        ))}
      {polls &&
        resource.data?.polls.data.map(p => (
          <Card key={p.id} title={p.title}>
            {!!p.description && <Text style={ui.text}>{p.description}</Text>}
            {p.questions.map(q => (
              <View key={q.id} style={{ gap: 8 }}>
                <Text style={ui.title}>{q.prompt}</Text>
                {q.options.map(o => (
                  <Button
                    key={o.id}
                    selected={q.responses.some(r => r.poll_option_id === o.id)}
                    disabled={
                      busy ||
                      !p.is_active ||
                      Boolean(
                        p.ends_at && Date.parse(p.ends_at) <= Date.now(),
                      ) ||
                      Boolean(
                        p.starts_at && Date.parse(p.starts_at) > Date.now(),
                      )
                    }
                    onPress={() =>
                      void send(
                        '/polls/' + p.id + '/questions/' + q.id + '/vote',
                        'PUT',
                        { option_id: o.id },
                      )
                    }
                  >
                    {o.label}
                  </Button>
                ))}
              </View>
            ))}
          </Card>
        ))}
      {(pages?.last_page ?? 0) > 1 && (
        <View style={ui.row}>
          <Button disabled={page <= 1} onPress={() => setPage(page - 1)}>
            {t('Anterior', 'Previous')}
          </Button>
          <Text>
            {page} / {pages?.last_page}
          </Text>
          <Button
            disabled={page >= (pages?.last_page ?? 1)}
            onPress={() => setPage(page + 1)}
          >
            {t('Seguinte', 'Next')}
          </Button>
        </View>
      )}
    </>
  );
}
