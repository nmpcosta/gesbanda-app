import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Pdf from 'react-native-pdf';
import { useKeepAwake } from '@sayem314/react-native-keep-awake';
import BlobUtil from 'react-native-blob-util';
import { API_BASE_URL } from './api';
import { Button, ui, useWords } from './mobileUI';
import type { GroupAssetSummary, GroupDocumentSummary } from './types';

export type MusicFile = {
  title: string;
  path: string;
  filename: string;
  mime?: string;
};
export function assetFile(item: GroupAssetSummary): MusicFile {
  return {
    title: item.title,
    path: `/groups/${item.group_id}/assets/${item.id}/download`,
    filename: item.meta?.original_name ?? item.title,
    mime: item.meta?.mime,
  };
}
export function documentFile(item: GroupDocumentSummary): MusicFile {
  return {
    title: item.title,
    path: `/groups/${item.group_id}/documents/${item.id}/download`,
    filename: item.title,
  };
}
export function isScore(item: GroupAssetSummary) {
  return (
    item.meta?.mime === 'application/pdf' ||
    /\.pdf$/i.test(item.meta?.original_name ?? item.meta?.path ?? item.title)
  );
}
type ReadyFile = { path: string; mime: string; pdf: boolean };
async function fetchFile(
  file: MusicFile,
  token: string,
  directory: string,
  index: number,
): Promise<ReadyFile> {
  const path = `${directory}/${index}`;
  const response = await BlobUtil.config({ path, followRedirect: false }).fetch(
    'GET',
    API_BASE_URL + file.path,
    { Authorization: 'Bearer ' + token, Accept: '*/*' },
  );
  const info = response.info();
  if (info.status !== 200) throw Error('HTTP ' + info.status);
  const headers = Object.fromEntries(
    Object.entries(info.headers).map(([key, value]) => [
      key.toLowerCase(),
      String(value),
    ]),
  );
  const mime = (
    headers['content-type'] ||
    file.mime ||
    'application/octet-stream'
  ).split(';')[0];
  const name = headers['content-disposition'] || file.filename;
  const pdf = mime === 'application/pdf' || /\.pdf(?:["';\s]|$)/i.test(name);
  const extension = pdf
    ? 'pdf'
    : /\.([a-z\d]{1,10})(?:["';\s]|$)/i.exec(name)?.[1] ?? 'bin';
  const target = path + '.' + extension;
  await BlobUtil.fs.mv(path, target);
  return { path: target, mime, pdf };
}

export function ScoreReader({
  files,
  token,
  onClose,
}: {
  files: MusicFile[];
  token: string;
  onClose: () => void;
}) {
  const t = useWords();
  useKeepAwake();
  const [index, setIndex] = useState(0);
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState<Record<number, ReadyFile>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [page, setPage] = useState('');
  const current = ready[index];
  const source = useMemo(
    () => (current ? { uri: 'file://' + current.path } : undefined),
    [current],
  );

  useEffect(() => {
    let active = true;
    const directory =
      BlobUtil.fs.dirs.CacheDir +
      '/gesbanda-' +
      Date.now() +
      '-' +
      Math.random().toString(36).slice(2);
    setReady({});
    setErrors({});
    const work = (async () => {
      await BlobUtil.fs.mkdir(directory);
      for (let i = 0; i < files.length && active; i++) {
        try {
          const loaded = await fetchFile(files[i], token, directory, i);
          if (active) setReady(old => ({ ...old, [i]: loaded }));
        } catch (err) {
          if (active) setErrors(old => ({ ...old, [i]: String(err) }));
        }
      }
    })().catch((err: unknown) => {
      if (active)
        setErrors(Object.fromEntries(files.map((_, i) => [i, String(err)])));
    });
    return () => {
      active = false;
      void work.finally(() =>
        BlobUtil.fs.unlink(directory).catch(() => undefined),
      );
    };
  }, [files, token, version]);

  function change(next: number) {
    setIndex(next);
    setPage('');
  }
  async function openExternal() {
    if (!current) return;
    try {
      if (Platform.OS === 'ios') await BlobUtil.ios.openDocument(current.path);
      else await BlobUtil.android.actionViewIntent(current.path, current.mime);
    } catch (err) {
      setErrors(old => ({ ...old, [index]: String(err) }));
    }
  }
  return (
    <Modal visible animationType="slide" supportedOrientations={['portrait', 'landscape']} onRequestClose={onClose}>
      <SafeAreaView style={ui.root}>
        <View style={ui.header}>
          <Text style={ui.brand}>
            {t('Ficheiro', 'File')} {index + 1} / {files.length}
            {page ? t('   ·   Página ', '   ·   Page ') + page : ''}
          </Text>
          <Text style={ui.band} numberOfLines={2}>
            {files[index].title}
          </Text>
        </View>
        {errors[index] ? (
          <View style={ui.body}>
            <Text style={ui.error}>
              {t(
                'Não foi possível abrir o ficheiro.',
                'Could not open the file.',
              )}{' '}
              {errors[index]}
            </Text>
            <Button onPress={() => setVersion(n => n + 1)}>
              {t('Tentar novamente', 'Retry')}
            </Button>
          </View>
        ) : !current ? (
          <ActivityIndicator />
        ) : current.pdf && source ? (
          <Pdf
            key={current.path}
            source={source}
            style={ui.root}
            trustAllCerts={false}
            onPageChanged={(n, total) => setPage(`${n} / ${total}`)}
            onError={err =>
              setErrors(old => ({ ...old, [index]: String(err) }))
            }
          />
        ) : (
          <View style={ui.body}>
            <Button onPress={() => void openExternal()}>
              {t('Abrir documento', 'Open document')}
            </Button>
          </View>
        )}
        <View style={[ui.row, { padding: 10 }]}>
          {files.length > 1 && (
            <>
              <Button disabled={index === 0} onPress={() => change(index - 1)}>
                {t('Anterior', 'Previous')}
              </Button>
              <Button
                primary
                disabled={index === files.length - 1}
                onPress={() => change(index + 1)}
              >
                {t('Seguinte', 'Next')}
              </Button>
            </>
          )}
          <Button onPress={onClose}>{t('Fechar', 'Close')}</Button>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
