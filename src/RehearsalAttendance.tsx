import React, { useRef, useState } from 'react';
import {
  Modal,
  PermissionsAndroid,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';
import { apiRequest } from './api';
import { Button, Card, ui, useWords } from './mobileUI';
import { useMobileResource } from './useMobileResource';

export function attendanceCode(value: string): string | undefined {
  return /^(?:[A-Za-z0-9]{48})$/.test(value.trim())
    ? value.trim()
    : /[#?&]check-in=([A-Za-z0-9]{48})(?:[&#]|$)/.exec(value.trim())?.[1];
}
function Scanner({
  onRead,
  onClose,
}: {
  onRead: (value: string) => void;
  onClose: () => void;
}) {
  const device = useCameraDevice('back');
  const t = useWords();
  const consumed = useRef(false);
  const scanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      const code = codes
        .map(item => attendanceCode(item.value ?? ''))
        .find(Boolean);
      if (code && !consumed.current) {
        consumed.current = true;
        onRead(code);
      }
    },
  });
  return (
    <Modal visible onRequestClose={onClose}>
      <View style={[ui.root, { padding: 16 }]}>
        {device ? (
          <Camera
            style={ui.root}
            device={device}
            isActive
            codeScanner={scanner}
          />
        ) : (
          <Text>
            {t(
              'Câmara indisponível. Podes colar o código da chamada.',
              'Camera unavailable. You can paste the check-in code.',
            )}
          </Text>
        )}
        <Button onPress={onClose}>{t('Fechar câmara', 'Close camera')}</Button>
      </View>
    </Modal>
  );
}
type Attendance = {
  data: { user_id: number; status: 'present' | 'absent' | 'excused' }[];
  location_open: boolean;
};
export function RehearsalAttendance({
  eventId,
  token,
  userId,
  open,
}: {
  eventId: number;
  token: string;
  userId: number;
  open: boolean;
}) {
  const t = useWords();
  const resource = useMobileResource<Attendance>(
    `/events/${eventId}/attendance`,
    token,
  );
  const status = resource.data?.data.find(
    item => item.user_id === userId,
  )?.status;
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const permission = useCameraPermission();
  async function check(code?: string) {
    setScanning(false);
    setBusy(true);
    setError('');
    try {
      if (code)
        await apiRequest(
          '/attendance/check-in/qr',
          { method: 'POST', body: JSON.stringify({ code, event_id: eventId }) },
          token,
        );
      else {
        if (Platform.OS === 'android') {
          const grants = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ]);
          if (
            grants[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] !==
            'granted'
          )
            throw Error(
              t(
                'A chamada precisa de localização precisa.',
                'Precise location is required for check-in.',
              ),
            );
        }
        Geolocation.setRNConfiguration({
          authorizationLevel: 'whenInUse',
          enableBackgroundLocationUpdates: false,
          skipPermissionRequests: false,
        });
        const coords = await new Promise<{
          latitude: number;
          longitude: number;
          accuracy: number;
        }>((resolve, reject) =>
          Geolocation.getCurrentPosition(
            p => resolve(p.coords),
            e => reject(Error(e.message)),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
          ),
        );
        await apiRequest(
          `/events/${eventId}/attendance/check-in/location`,
          {
            method: 'POST',
            body: JSON.stringify({
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
            }),
          },
          token,
        );
      }
      setValue('');
      setManual(false);
      resource.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title={t('Chamada', 'Attendance')}>
      <Text style={ui.text}>
        {status === 'present'
          ? t('Presença registada', 'Checked in')
          : status === 'absent'
          ? t('Falta registada', 'Marked absent')
          : status === 'excused'
          ? t('Falta justificada', 'Excused absence')
          : t('Sem registo de presença', 'No attendance recorded')}
      </Text>
      {open && !status && (
        <>
          <View style={ui.row}>
            <Button
              primary
              disabled={busy}
              onPress={async () => {
                if (
                  permission.hasPermission ||
                  (await permission.requestPermission())
                )
                  setScanning(true);
                else {
                  setManual(true);
                  setError(
                    t(
                      'Permite o acesso à câmara ou cola o código.',
                      'Allow camera access or paste the code.',
                    ),
                  );
                }
              }}
            >
              {t('Ler QR da chamada', 'Scan check-in QR')}
            </Button>
            {resource.data?.location_open && (
              <Button disabled={busy} onPress={() => void check()}>
                {t('Marcar presença aqui', 'Check in here')}
              </Button>
            )}
            <Button disabled={busy} onPress={() => setManual(!manual)}>
              {t('Introduzir código', 'Enter code')}
            </Button>
          </View>
          {manual && (
            <>
              <TextInput
                style={ui.input}
                value={value}
                onChangeText={setValue}
                autoCapitalize="none"
                placeholder={t(
                  'Código ou ligação da chamada',
                  'Check-in code or link',
                )}
              />
              <Button
                disabled={busy || !attendanceCode(value)}
                onPress={() => void check(attendanceCode(value))}
              >
                {t('Confirmar presença', 'Confirm attendance')}
              </Button>
            </>
          )}
        </>
      )}
      {!!(resource.error || error) && (
        <Text style={ui.error}>{error || resource.error}</Text>
      )}
      {scanning && (
        <Scanner
          onRead={code => void check(code)}
          onClose={() => setScanning(false)}
        />
      )}
    </Card>
  );
}
