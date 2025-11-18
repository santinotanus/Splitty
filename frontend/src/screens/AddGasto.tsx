import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useAddGasto } from '../viewmodels/useAddGasto';
import * as gastosApi from '../api/gastos';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Importación necesaria
import { Feather } from '@expo/vector-icons'; // Importación necesaria para el ícono de regresar

export default function AddGasto({ route, navigation }: any) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets(); // Obtener insets del área segura
  const styles = getStyles(colors, insets); // Estilos dinámicos

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Nuevo Header fijo (similar a InvitarMiembro.tsx) */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={colors.iconColor} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Añadir Gasto</Text>
          <Text style={styles.subtitle}>{nombre}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Card de Monto y Descripción */}
        <View style={styles.card}>
          <Text style={styles.label}>Monto total</Text>
          <TextInput
            style={styles.input}
            placeholder="$ 0"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Descripción</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Descripción"
            placeholderTextColor={colors.textMuted}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Card de Quien Pagó */}
        <View style={styles.card}>
          <Text style={styles.label}>¿Quién pagó?</Text>
          {members.map(m => (
            <TouchableOpacity key={m.id} style={styles.row} onPress={() => setPayerId(m.id)}>
              <View style={[styles.radio, payerId === m.id && { backgroundColor: colors.primary, borderColor: colors.primary }]} />
              <Text style={styles.rowText}>{m.id === (members.find(x => x.firebase_uid === user?.uid)?.id) ? 'Tú' : (m.nombre || m.correo || 'Miembro')}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Card de Participantes */}
        <View style={styles.card}>
          <Text style={styles.label}>Participantes</Text>
          {members.map(m => (
            <TouchableOpacity key={m.id} style={styles.row} onPress={() => toggleParticipant(m.id)}>
              <View style={[styles.checkbox, selectedIds[m.id] && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                {selectedIds[m.id] && <Text style={{ color: '#fff' }}>✓</Text>}
              </View>
              <Text style={styles.rowText}>{m.nombre || m.correo || 'Miembro'}</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.divideButton} onPress={handleDivideEqual}>
            <Text style={styles.modeTextActive}>Dividir en partes iguales</Text>
          </TouchableOpacity>
        </View>

        {/* Card de División del Gasto */}
        <View style={styles.card}>
          <Text style={styles.label}>División del gasto</Text>
          <View style={styles.modeButtonRow}>
            <TouchableOpacity style={[styles.modeButton, divisionMode === 'equal' && { backgroundColor: colors.primary }]} onPress={() => setDivisionMode('equal')}>
              <Text style={divisionMode === 'equal' ? styles.modeTextActive : styles.modeText}>Partes iguales</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, divisionMode === 'custom-amount' && { backgroundColor: colors.primary }]} onPress={() => setDivisionMode('custom-amount')}>
              <Text style={divisionMode === 'custom-amount' ? styles.modeTextActive : styles.modeText}>Por monto</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeButton, divisionMode === 'custom-percent' && { backgroundColor: colors.primary }]} onPress={() => setDivisionMode('custom-percent')}>
              <Text style={divisionMode === 'custom-percent' ? styles.modeTextActive : styles.modeText}>Por %</Text>
            </TouchableOpacity>
          </View>

          {participantList.length === 0 ? (
            <Text style={{ color: colors.textMuted }}>No hay participantes seleccionados</Text>
          ) : (
            participantList.map(p => (
              <View key={p.id} style={styles.divisionRow}>
                <Text style={styles.divisionText}>{p.nombre || p.correo}</Text>
                <View style={styles.divisionDetailRow}>
                  {divisionMode === 'equal' && (
                    <>
                      <Text style={styles.divisionDetailText}>{(100 / participantsCount).toFixed(1)} %</Text>
                      <Text style={styles.divisionDetailText}>${(equalShare).toFixed(2)}</Text>
                    </>
                  )}
                  {divisionMode === 'custom-amount' && (
                    <TextInput
                      style={styles.inputSmall}
                      keyboardType="numeric"
                      placeholder="$0.00"
                      placeholderTextColor={colors.textMuted}
                      onChangeText={(v) => updateCustomAmount(p.id, v)}
                      value={(customSplits[p.id]?.amount ?? '').toString()}
                    />
                  )}
                  {divisionMode === 'custom-percent' && (
                    <TextInput
                      style={styles.inputSmall}
                      keyboardType="numeric"
                      placeholder="0 %"
                      placeholderTextColor={colors.textMuted}
                      onChangeText={(v) => updateCustomPercent(p.id, v)}
                      value={(customSplits[p.id]?.percent ?? '').toString()}
                    />
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Barra de guardado con padding inferior dinámico */}
      <TouchableOpacity style={styles.saveBar} onPress={handleSave}>
        <Text style={styles.modeTextActive}>Guardar gasto</Text>
      </TouchableOpacity>
    </View>
  );
}

// Estilos dinámicos definidos como función al final del archivo.
const getStyles = (colors: any, insets: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background
  },
  // ESTILO DE HEADER FIJO (Copiado de InvitarMiembro.tsx)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: insets.top + 16, // Dinámico
    borderBottomWidth: 1,
    backgroundColor: colors.modalBackground,
    borderBottomColor: colors.borderLight,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    color: colors.textSecondary
  },
  // Content padding para evitar que el contenido se oculte detrás del footer
  scrollContent: {
    padding: 16,
    paddingBottom: insets.bottom + 14 + 16 + 80, // insets.bottom + paddingTop/Bottom de saveBar + padding del último card
  },
  // Estilo de tarjeta
  card: {
    marginHorizontal: 0, // Las tarjetas ya están dentro de un padding: 16
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    backgroundColor: colors.modalBackground,
    borderColor: colors.borderLight
  },
  label: {
    fontWeight: '700',
    marginBottom: 6,
    color: colors.text
  },
  input: {
    padding: 12, // Aumentado para mejor tacto
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: colors.cardBackground,
    color: colors.text,
    borderColor: colors.borderLight,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8
  },
  rowText: {
    marginLeft: 8,
    color: colors.text
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.border
  },
  divideButton: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.primary
  },
  // Barra de guardado con padding inferior dinámico (fijo en el fondo)
  saveBar: {
    paddingTop: 14,
    paddingBottom: insets.bottom + 14, // Padding dinámico
    alignItems: 'center',
    backgroundColor: colors.primary,
    position: 'absolute', // Fija al fondo
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modeButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: {
    fontWeight: '700',
    color: colors.text
  },
  modeTextActive: {
    color: colors.primaryText, // Blanco en ambos temas
    fontWeight: '700'
  },
  divisionRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: colors.borderLight
  },
  divisionText: {
    fontWeight: '700',
    color: colors.text
  },
  divisionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    alignItems: 'center'
  },
  divisionDetailText: {
    color: colors.text
  },
  inputSmall: {
    padding: 6,
    borderRadius: 8,
    minWidth: 80,
    textAlign: 'right',
    borderWidth: 1,
    backgroundColor: colors.cardBackground,
    color: colors.text,
    borderColor: colors.borderLight
  },
});