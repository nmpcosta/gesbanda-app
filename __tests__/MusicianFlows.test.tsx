import { attendanceCode } from '../src/RehearsalAttendance';
import { eventScores } from '../src/MusicianEvent';
import type { GroupAssetSummary, RepertoirePieceSummary } from '../src/types';

jest.mock('react-native-vision-camera', () => ({}));
jest.mock('@react-native-community/geolocation', () => ({}));
jest.mock('react-native-pdf', () => 'Pdf');
jest.mock('@sayem314/react-native-keep-awake', () => ({useKeepAwake: jest.fn()}));
jest.mock('react-native-blob-util', () => ({}));
jest.mock('react-native-safe-area-context', () => ({}));
jest.mock('../src/auth', () => ({}));

const piece = (id: number, title: string): RepertoirePieceSummary => ({
  id, title, group_id: 8, composer: null, arranger: null, duration_seconds: null, difficulty_level: null, notes: null,
});
function part(id: number, pieceId: number | null, eventId: number | null, instrument: string | null): GroupAssetSummary {
  return {id, group_id:8, repertoire_piece_id:pieceId, event_id:eventId, uploaded_by_user_id:1,
    asset_type:'score', title:'Pauta '+id, file_url:'', instrument, meta:{original_name:'pauta.pdf',mime:'application/pdf'}};
}

test('live mode follows the concert order and selects one permitted part per piece', () => {
  const pieces=[piece(2,'Abertura'),piece(1,'Finale')];
  const parts=[part(1,1,null,null),part(2,2,null,null),part(3,2,71,'Clarinete'),part(4,2,72,'Clarinete'),part(5,null,71,null)];
  const result=eventScores(pieces,parts,71,{},['Clarinete']);
  expect(result.map(file=>file.title)).toEqual(['Abertura · Pauta 3','Finale · Pauta 1','Pauta 5']);
  expect(result[0].path).toBe('/groups/8/assets/3/download');
  expect(eventScores(pieces,parts,71,{2:2},['Clarinete'])[0].title).toBe('Abertura · Pauta 2');
});
test('unrelated concert attachments and non-PDF documents stay outside the live set', () => {
  const other=part(20,null,20,null);
  const audio={...part(21,1,null,null),meta:{original_name:'ensaio.mp3',mime:'audio/mpeg'}};
  expect(eventScores([piece(1,'Ensaio')],[other,audio],71)).toEqual([]);
});
test('check-in accepts both the QR used by the web workspace and its raw code', () => {
  const code='A1'.repeat(24);
  expect(attendanceCode(code)).toBe(code);
  expect(attendanceCode('https://example.test/?app=1#check-in='+code)).toBe(code);
  expect(attendanceCode('https://example.test/?app=1')).toBeUndefined();
  expect(attendanceCode('invalid')).toBeUndefined();
});
