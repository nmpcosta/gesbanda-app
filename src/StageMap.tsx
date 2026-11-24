import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ui, useWords } from './mobileUI';

export type StagePlan = {
  id: number;
  title: string;
  event_id: number | null;
  layout_type: 'auditorium' | 'parade';
  positions: {
    x: number;
    y: number;
    label: string;
    section?: string | null;
    member_id?: number | null;
  }[];
};
export function StageMap({
  plans,
  memberId,
}: {
  plans: StagePlan[];
  memberId?: number;
}) {
  const t = useWords();
  const [id, setId] = useState<number>();
  const [selected, setSelected] = useState<number>();
  const [width, setWidth] = useState(0);
  const plan = plans.find(p => p.id === id) ?? plans[0];
  if (!plan)
    return (
      <Card>
        <Text style={ui.muted}>
          {t('Sem planta disponível.', 'No stage plan available.')}
        </Text>
      </Card>
    );
  return (
    <Card title={plan.title}>
      {plans.length > 1 && (
        <View style={ui.row}>
          {plans.map(p => (
            <Button
              key={p.id}
              selected={p.id === plan.id}
              onPress={() => {
                setId(p.id);
                setSelected(undefined);
              }}
            >
              {p.title}
            </Button>
          ))}
        </View>
      )}
      <Text style={ui.muted}>
        {plan.layout_type === 'parade'
          ? t('Sentido do desfile ↑', 'Parade direction ↑')
          : t('Fundo do palco', 'Back of stage')}
      </Text>
      <View
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
        style={{ height: 244, backgroundColor: '#f2edf5', borderRadius: 12 }}
      >
        {width > 0 &&
          plan.positions.map((pos, i) => (
            <Text
              key={i}
              accessibilityRole="button"
              accessibilityLabel={pos.label}
              onPress={() => setSelected(i)}
              style={{
                position: 'absolute',
                left: (Math.min(100, Math.max(0, pos.x)) * (width - 32)) / 100,
                top: Math.min(100, Math.max(0, pos.y)) * 2.12,
                width: 32,
                height: 32,
                textAlign: 'center',
                textAlignVertical: 'center',
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor:
                  pos.member_id === memberId && memberId
                    ? '#633b78'
                    : '#ded2e8',
                color:
                  pos.member_id === memberId && memberId ? 'white' : '#372340',
              }}
            >
              {i + 1}
            </Text>
          ))}
      </View>
      {plan.layout_type === 'auditorium' && (
        <Text style={ui.muted}>
          {t('Frente do palco · Público', 'Front of stage · Audience')}
        </Text>
      )}
      {plan.positions.map((pos, i) => (
        <Text
          key={i}
          style={
            selected === i || (memberId && memberId === pos.member_id)
              ? ui.title
              : ui.text
          }
        >
          {i + 1}. {pos.label}
          {pos.section ? ' · ' + pos.section : ''}
          {memberId && memberId === pos.member_id
            ? t(' · O meu lugar', ' · My position')
            : ''}
        </Text>
      ))}
    </Card>
  );
}
