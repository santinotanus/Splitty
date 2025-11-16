import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAddGasto } from '../viewmodels/useAddGasto';
import * as gastosApi from '../api/gastos';
import { useAuth } from '../contexts/AuthContext';

export default function AddGasto({ route, navigation }: any) {
  const { grupoId, nombre } = route.params || {};
  const { members, loading, refreshMembers } = useAddGasto(grupoId);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [payerId, setPayerId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [divisionMode, setDivisionMode] = useState<'equal' | 'custom-amount' | 'custom-percent'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, { amount?: number; percent?: number }>>({});
  const { user } = useAuth();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [grupoId]);

  useEffect(() => {
    // when members change (from viewmodel), initialize selection defaults
    const map: Record<string, boolean> = {};
    members.forEach((m: any) => { map[m.id] = true; });
    setSelectedIds(map);
    if (members.length > 0) setPayerId(members[0].id);
  }, [members]);

  const participantList = useMemo(() => members.filter(m => selectedIds[m.id]), [members, selectedIds]);
  const participantsCount = participantList.length;

  const numericAmount = Number((amount || '').toString().replace(/[^0-9.]/g, '')) || 0;

  const equalShare = participantsCount > 0 ? (numericAmount / participantsCount) : 0;

  const toggleParticipant = (id: string) => {
    setSelectedIds(prev => ({ ...prev, [id]: !prev[id] }));
    // If payer was deselected, clear payer
    if (payerId === id && selectedIds[id]) {
      setPayerId(null);
    }
  };

  const updateCustomAmount = (id: string, value: string) => {
    const num = Number(value.toString().replace(/[^0-9.]/g, '')) || 0;
    setCustomSplits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), amount: num } }));
  };

  const updateCustomPercent = (id: string, value: string) => {
    const num = Number(value.toString().replace(/[^0-9.]/g, '')) || 0;
    setCustomSplits(prev => ({ ...prev, [id]: { ...(prev[id] || {}), percent: num } }));
  };

  const handleDivideEqual = () => {
    if (participantsCount === 0) return Alert.alert('Participantes', 'Seleccioná al menos un participante');
    setDivisionMode('equal');
    Alert.alert('División', `El gasto se dividirá en partes iguales entre ${participantsCount} personas.`);
  };

  const handleSave = () => {
    if (numericAmount <= 0) return Alert.alert('Monto inválido', 'Ingresá un monto válido');
    if (!payerId) return Alert.alert('Quien pagó', 'Seleccioná quien pagó');
    if (participantsCount === 0) return Alert.alert('Participantes', 'Seleccioná al menos un participante');
    // Build division according to mode
    let division: Array<{ id: string; monto: number; percent?: number }> = [];
    if (divisionMode === 'equal') {
      division = participantList.map(p => ({ id: p.id, monto: parseFloat((equalShare).toFixed(2)), percent: parseFloat((100 / participantsCount).toFixed(2)) }));
    } else if (divisionMode === 'custom-amount') {
      division = participantList.map(p => ({ id: p.id, monto: parseFloat(((customSplits[p.id]?.amount) || 0).toFixed(2)) }));
      const totalAssigned = division.reduce((s, x) => s + x.monto, 0);
      if (Math.abs(totalAssigned - numericAmount) > 0.01) return Alert.alert('Distribución inválida', 'La suma de montos asignados no coincide con el total');
    } else if (divisionMode === 'custom-percent') {
      division = participantList.map(p => ({ id: p.id, monto: parseFloat((((customSplits[p.id]?.percent || 0) / 100) * numericAmount).toFixed(2)), percent: customSplits[p.id]?.percent }));
      const totalPct = participantList.reduce((s, p) => s + (customSplits[p.id]?.percent || 0), 0);
      if (Math.abs(totalPct - 100) > 0.5) return Alert.alert('Distribución inválida', 'Los porcentajes deben sumar 100%');
    }

    const payload = {
      grupoId,
      monto: numericAmount,
      descripcion: description,
      pagadorId: payerId,
      participantes: participantList.map(p => p.id),
      division,
    };
    (async () => {
      try {
        const body = {
          pagadorId: payload.pagadorId,
          descripcion: payload.descripcion,
          importe: payload.monto,
          lugar: undefined,
          fecha_pago: undefined,
          participantes: payload.division.map((d: any) => ({ usuarioId: d.id, parte_importe: d.monto, parte_porcentaje: d.percent ?? null }))
        };
        console.log('Creating expense', body);
        const res = await gastosApi.createExpense(grupoId, body);
        console.log('createExpense response', res);
        Alert.alert('Hecho', 'Gasto creado');
        // go back to group (and Gastos tab will refresh on focus)
        navigation.goBack();
      } catch (e: any) {
        console.error('createExpense error', e);
        const msg = e?.response?.data?.error || e?.message || 'Error al crear gasto';
        Alert.alert('Error', String(msg));
      }
    })();
  };

  if (loading) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color="#033E30" /></View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.back}>{'‹'}</Text></TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.title}>Añadir Gasto</Text>
            <Text style={styles.subtitle}>{nombre}</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Monto total</Text>
          <TextInput
            style={styles.input}
            placeholder="$ 0"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Descripción</Text>
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Descripción" multiline value={description} onChangeText={setDescription} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>¿Quién pagó?</Text>
          {members.map(m => (
            <TouchableOpacity key={m.id} style={styles.row} onPress={() => setPayerId(m.id)}>
              <View style={[styles.radio, payerId === m.id && styles.radioSelected]} />
              <Text style={{ marginLeft: 8 }}>{m.id === (members.find(x => x.firebase_uid === user?.uid)?.id) ? 'Tú' : (m.nombre || m.correo || 'Miembro')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Participantes</Text>
          {members.map(m => (
            <TouchableOpacity key={m.id} style={styles.row} onPress={() => toggleParticipant(m.id)}>
              <View style={[styles.checkbox, selectedIds[m.id] && styles.checkboxChecked]}>
                {selectedIds[m.id] && <Text style={{ color: '#fff' }}>✓</Text>}
              </View>
              <Text style={{ marginLeft: 8 }}>{m.nombre || m.correo || 'Miembro'}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.divideButton} onPress={handleDivideEqual}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Dividir en partes iguales</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>División del gasto</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
            <TouchableOpacity style={[styles.modeButton, divisionMode === 'equal' && styles.modeButtonActive]} onPress={() => setDivisionMode('equal')}>
              <Text style={divisionMode === 'equal' ? styles.modeTextActive : styles.modeText}>Partes iguales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, divisionMode === 'custom-amount' && styles.modeButtonActive]} onPress={() => setDivisionMode('custom-amount')}>
              <Text style={divisionMode === 'custom-amount' ? styles.modeTextActive : styles.modeText}>Por monto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, divisionMode === 'custom-percent' && styles.modeButtonActive]} onPress={() => setDivisionMode('custom-percent')}>
              <Text style={divisionMode === 'custom-percent' ? styles.modeTextActive : styles.modeText}>Por %</Text>
            </TouchableOpacity>
          </View>

          {participantList.length === 0 ? (
            <Text style={{ color: '#666' }}>No hay participantes seleccionados</Text>
          ) : (
            participantList.map(p => (
              <View key={p.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
                <Text style={{ fontWeight: '700' }}>{p.nombre || p.correo}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
                  {divisionMode === 'equal' && (
                    <>
                      <Text>{(100 / participantsCount).toFixed(1)} %</Text>
                      <Text>${(equalShare).toFixed(2)}</Text>
                    </>
                  )}
                  {divisionMode === 'custom-amount' && (
                    <TextInput style={styles.inputSmall} keyboardType="numeric" placeholder="$0.00" onChangeText={(v) => updateCustomAmount(p.id, v)} value={(customSplits[p.id]?.amount ?? '').toString()} />
                  )}
                  {divisionMode === 'custom-percent' && (
                    <TextInput style={styles.inputSmall} keyboardType="numeric" placeholder="0 %" onChangeText={(v) => updateCustomPercent(p.id, v)} value={(customSplits[p.id]?.percent ?? '').toString()} />
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.saveBar} onPress={handleSave}>
        <Text style={{ color: '#fff', fontWeight: '700' }}>Guardar gasto</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F4F1' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  back: { fontSize: 28, color: '#033E30', width: 32 },
  title: { fontSize: 18, fontWeight: '700', color: '#033E30' },
  subtitle: { color: '#666', fontSize: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 12 },
  label: { fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: '#f6f9f6', padding: 8, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#ccc' },
  radioSelected: { backgroundColor: '#033E30', borderColor: '#033E30' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#033E30', borderColor: '#033E30' },
  divideButton: { marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: '#033E30', alignItems: 'center' },
  saveBar: { backgroundColor: '#033E30', padding: 14, alignItems: 'center' },
  modeButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f2f7f4' },
  modeButtonActive: { backgroundColor: '#033E30' },
  modeText: { color: '#033E30', fontWeight: '700' },
  modeTextActive: { color: '#fff', fontWeight: '700' },
  inputSmall: { backgroundColor: '#f6f9f6', padding: 6, borderRadius: 8, minWidth: 80, textAlign: 'right' },
});
