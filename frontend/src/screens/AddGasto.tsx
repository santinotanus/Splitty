import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as groupsApi from '../api/groups';

export default function AddGasto({ route, navigation }: any) {
  const { grupoId, nombre } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [payerId, setPayerId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    fetchMembers();
  }, [grupoId]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await groupsApi.getGroupMembers(grupoId);
      const arr = Array.isArray(res) ? res : res?.members ?? [];
      setMembers(arr);
      // default: all members selected, payer = first
      const map: Record<string, boolean> = {};
      arr.forEach((m: any) => { map[m.id] = true; });
      setSelectedIds(map);
      if (arr.length > 0) setPayerId(arr[0].id);
    } catch (e) {
      console.error('getGroupMembers', e);
      setMembers([]);
      setSelectedIds({});
    } finally {
      setLoading(false);
    }
  };

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

  const handleDivideEqual = () => {
    if (participantsCount === 0) return Alert.alert('Participantes', 'Seleccioná al menos un participante');
    Alert.alert('Division', `El gasto se dividirá en partes iguales entre ${participantsCount} personas.`);
  };

  const handleSave = () => {
    if (numericAmount <= 0) return Alert.alert('Monto inválido', 'Ingresá un monto válido');
    if (!payerId) return Alert.alert('Quien pagó', 'Seleccioná quien pagó');
    if (participantsCount === 0) return Alert.alert('Participantes', 'Seleccioná al menos un participante');

    // Since backend endpoint isn't ready, just log the payload and show placeholder alert
    const payload = {
      grupoId,
      monto: numericAmount,
      descripcion: description,
      pagadorId: payerId,
      participantes: participantList.map(p => p.id),
      division: participantList.map(p => ({ id: p.id, monto: parseFloat((equalShare).toFixed(2)) })),
    };
    console.log('AddGasto payload (mock):', payload);
    Alert.alert('Guardar gasto', 'Funcionalidad aún no implementada en backend. Datos: ' + JSON.stringify(payload, null, 2));
    navigation.goBack();
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
              <Text style={{ marginLeft: 8 }}>{m.name || m.displayName || m.email || 'Miembro'}</Text>
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
              <Text style={{ marginLeft: 8 }}>{m.name || m.displayName || m.email || 'Miembro'}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.divideButton} onPress={handleDivideEqual}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Dividir en partes iguales</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>División del gasto</Text>
          {participantList.length === 0 ? (
            <Text style={{ color: '#666' }}>No hay participantes seleccionados</Text>
          ) : (
            participantList.map(p => (
              <View key={p.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f0f0f0' }}>
                <Text style={{ fontWeight: '700' }}>{p.name || p.displayName || p.email}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                  <Text>{(100 / participantsCount).toFixed(1)} %</Text>
                  <Text>${(equalShare).toFixed(2)}</Text>
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
});
