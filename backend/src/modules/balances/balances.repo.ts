import { db } from '../../config/db';

export async function getMyBalance(grupoId: string, usuarioId: string) {
  const row = await db('dbo.saldos_grupo')
    .select('balance')
    .where({ grupo_id: grupoId, usuario_id: usuarioId })
    .first();
  
  return row?.balance ? parseFloat(row.balance.toString()) : 0;
}

export async function getMyDebts(grupoId: string, usuarioId: string) {
  // Obtener mi balance
  const myBalance = await getMyBalance(grupoId, usuarioId);
  
  // Si mi balance es positivo o cero, no debo nada
  if (myBalance >= 0) {
    return [];
  }

  // Obtener todos los miembros del grupo con sus balances
  const miembros = await db('dbo.miembros_grupo as m')
    .join('dbo.saldos_grupo as s', function() {
      this.on('s.grupo_id', '=', 'm.grupo_id')
          .andOn('s.usuario_id', '=', 'm.usuario_id');
    })
    .join('dbo.usuarios as u', 'u.id', 'm.usuario_id')
    .where('m.grupo_id', grupoId)
    .where('m.usuario_id', '!=', usuarioId)
    .select(
      'm.usuario_id',
      'u.nombre as usuario_nombre',
      'u.correo as usuario_correo',
      's.balance'
    );

  // Calcular balances netos entre usuarios basándose en el ledger
  // Para simplificar, distribuimos la deuda proporcionalmente entre quienes tienen crédito
  const creditors = miembros.filter(m => parseFloat(m.balance.toString()) > 0);
  
  if (creditors.length === 0) {
    return [];
  }

  const totalCredit = creditors.reduce((sum, c) => sum + parseFloat(c.balance.toString()), 0);
  const myDebt = Math.abs(myBalance);

  // Distribuir la deuda proporcionalmente
  return creditors.map(c => {
    const credit = parseFloat(c.balance.toString());
    const proportion = credit / totalCredit;
    const debt = myDebt * proportion;
    
    return {
      haciaUsuario: c.usuario_id,
      haciaUsuarioNombre: c.usuario_nombre,
      haciaUsuarioCorreo: c.usuario_correo,
      importe: Math.round(debt * 100) / 100 // Redondear a 2 decimales
    };
  }).filter(d => d.importe > 0.01); // Filtrar deudas muy pequeñas
}

export async function getMyCredits(grupoId: string, usuarioId: string) {
  // Obtener mi balance
  const myBalance = await getMyBalance(grupoId, usuarioId);
  
  // Si mi balance es negativo o cero, nadie me debe
  if (myBalance <= 0) {
    return [];
  }

  // Obtener todos los miembros del grupo con balances negativos
  const debtors = await db('dbo.miembros_grupo as m')
    .join('dbo.saldos_grupo as s', function() {
      this.on('s.grupo_id', '=', 'm.grupo_id')
          .andOn('s.usuario_id', '=', 'm.usuario_id');
    })
    .join('dbo.usuarios as u', 'u.id', 'm.usuario_id')
    .where('m.grupo_id', grupoId)
    .where('m.usuario_id', '!=', usuarioId)
    .whereRaw('CAST(s.balance AS DECIMAL(12,2)) < 0')
    .select(
      'm.usuario_id',
      'u.nombre as usuario_nombre',
      'u.correo as usuario_correo',
      's.balance'
    );

  if (debtors.length === 0) {
    return [];
  }

  const totalDebt = debtors.reduce((sum, d) => sum + Math.abs(parseFloat(d.balance.toString())), 0);
  const myCredit = myBalance;

  // Distribuir el crédito proporcionalmente
  return debtors.map(d => {
    const debt = Math.abs(parseFloat(d.balance.toString()));
    const proportion = debt / totalDebt;
    const credit = myCredit * proportion;
    
    return {
      desdeUsuario: d.usuario_id,
      desdeUsuarioNombre: d.usuario_nombre,
      desdeUsuarioCorreo: d.usuario_correo,
      importe: Math.round(credit * 100) / 100 // Redondear a 2 decimales
    };
  }).filter(c => c.importe > 0.01); // Filtrar créditos muy pequeños
}

export async function getGroupSummary(grupoId: string) {
  // Total gastado del grupo
  const totalGastado = await db('dbo.gastos')
    .where('grupo_id', grupoId)
    .sum('importe as total')
    .first();
  
  const total = totalGastado?.total ? parseFloat(totalGastado.total.toString()) : 0;

  // Totales por usuario
  const porUsuario = await db('dbo.miembros_grupo as m')
    .leftJoin('dbo.usuarios as u', 'u.id', 'm.usuario_id')
    .leftJoin('dbo.saldos_grupo as s', function() {
      this.on('s.grupo_id', '=', 'm.grupo_id')
          .andOn('s.usuario_id', '=', 'm.usuario_id');
    })
    .leftJoin('dbo.gastos as g', function() {
      this.on('g.grupo_id', '=', 'm.grupo_id')
          .andOn('g.pagador_id', '=', 'm.usuario_id');
    })
    .where('m.grupo_id', grupoId)
    .groupBy('m.usuario_id', 'u.nombre', 'u.correo', 's.balance')
    .select(
      'm.usuario_id',
      'u.nombre',
      'u.correo',
      db.raw('COALESCE(SUM(g.importe), 0) as total_pagado'),
      db.raw('COALESCE(s.balance, 0) as balance')
    );

  // Calcular total adeudado (suma de partes en divisiones_gasto)
  const totalAdeudadoPorUsuario = await db('dbo.divisiones_gasto as d')
    .join('dbo.gastos as g', function() {
      this.on('g.id', '=', 'd.gasto_id')
          .andOn('g.grupo_id', '=', 'd.grupo_id');
    })
    .where('d.grupo_id', grupoId)
    .groupBy('d.usuario_id')
    .select(
      'd.usuario_id',
      db.raw(`
        SUM(
          CASE 
            WHEN d.parte_importe IS NOT NULL THEN d.parte_importe
            ELSE (g.importe * d.parte_porcentaje / 100)
          END
        ) as total_adeudado
      `)
    );

  // Crear un mapa de totales adeudados
  const adeudadoMap = new Map<string, number>();
  totalAdeudadoPorUsuario.forEach((row: any) => {
    adeudadoMap.set(row.usuario_id, parseFloat(row.total_adeudado.toString()));
  });

  // Combinar datos
  const porUsuarioCompleto = porUsuario.map((usuario: any) => {
    const totalPagado = parseFloat(usuario.total_pagado?.toString() || '0');
    const totalAdeudado = adeudadoMap.get(usuario.usuario_id) || 0;
    const balance = parseFloat(usuario.balance?.toString() || '0');

    return {
      usuarioId: usuario.usuario_id,
      usuarioNombre: usuario.nombre,
      usuarioCorreo: usuario.correo,
      totalPagado: Math.round(totalPagado * 100) / 100,
      totalAdeudado: Math.round(totalAdeudado * 100) / 100,
      balance: Math.round(balance * 100) / 100
    };
  });

  return {
    total: Math.round(total * 100) / 100,
    porUsuario: porUsuarioCompleto
  };
}

