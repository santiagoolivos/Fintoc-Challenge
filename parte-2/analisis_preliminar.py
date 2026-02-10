"""
Análisis preliminar de la cartola de Débito Directo
Período: 08 de Agosto al 14 de Septiembre 2022
"""

import pandas as pd
from datetime import datetime, timedelta
import numpy as np

# Cargar datos
df = pd.read_csv('/Users/santiagoolivos/Desktop/Yo/Proyectos externos/Desafío Fintoc/parte-2/inputs/debito_directo.csv')

# Convertir fecha
df['date'] = pd.to_datetime(df['date'])

# Clasificar movimientos
df['tipo_movimiento'] = df['description'].apply(
    lambda x: 'INGRESO_PAC' if 'Ingreso por PAC' in x else 'LIQUIDACION'
)

# Extraer banco (para ingresos)
df['banco'] = df['description'].apply(
    lambda x: x.replace('Ingreso por PAC Multibanco ', '').replace('Ingreso por PAC Multibco.', '')
    if 'Ingreso por PAC' in x else None
)

# Extraer comercio (para liquidaciones)
df['comercio'] = df['description'].apply(
    lambda x: x.replace('Liquidacion a: ', '') if 'Liquidacion a:' in x else None
)

print("=" * 80)
print("ANÁLISIS DE CARTOLA DÉBITO DIRECTO")
print("Período: 08 Agosto - 14 Septiembre 2022")
print("=" * 80)

# 1. Resumen general
print("\n1. RESUMEN GENERAL")
print("-" * 40)
ingresos = df[df['tipo_movimiento'] == 'INGRESO_PAC']
liquidaciones = df[df['tipo_movimiento'] == 'LIQUIDACION']

total_ingresos = ingresos['amount'].sum()
total_liquidaciones = abs(liquidaciones['amount'].sum())

print(f"Total Ingresos PAC: ${total_ingresos:,.0f} CLP ({len(ingresos)} movimientos)")
print(f"Total Liquidaciones: ${total_liquidaciones:,.0f} CLP ({len(liquidaciones)} movimientos)")
print(f"Diferencia (Ingresos - Liquidaciones): ${total_ingresos - total_liquidaciones:,.0f} CLP")

# 2. Análisis por banco
print("\n2. INGRESOS POR BANCO")
print("-" * 40)
por_banco = ingresos.groupby('banco')['amount'].agg(['sum', 'count']).sort_values('sum', ascending=False)
por_banco.columns = ['Total', 'Cantidad']
print(por_banco.to_string())

# 3. Análisis por comercio
print("\n3. LIQUIDACIONES POR COMERCIO")
print("-" * 40)
por_comercio = liquidaciones.groupby('comercio')['amount'].agg(['sum', 'count']).sort_values('sum')
por_comercio['sum'] = por_comercio['sum'].abs()
por_comercio.columns = ['Total', 'Cantidad']
print(por_comercio.to_string())

# 4. Verificación del flujo: Ingreso día N -> Liquidación día N+1 hábil
print("\n4. VERIFICACIÓN DE FLUJO (Ingreso D -> Liquidación D+1 hábil)")
print("-" * 40)

# Función para obtener siguiente día hábil (simplificado: excluye sábado y domingo)
def siguiente_dia_habil(fecha):
    siguiente = fecha + timedelta(days=1)
    while siguiente.weekday() >= 5:  # 5=sábado, 6=domingo
        siguiente += timedelta(days=1)
    return siguiente

# Agrupar ingresos por fecha
ingresos_por_fecha = ingresos.groupby('date')['amount'].sum().to_dict()

# Agrupar liquidaciones por fecha
liquidaciones_por_fecha = liquidaciones.groupby('date')['amount'].sum().abs().to_dict()

print("\nFecha Ingreso | Monto Ingreso | Fecha Liq. Esperada | Fecha Liq. Real | Monto Liquidado | Match")
print("-" * 100)

anomalias_timing = []
for fecha_ingreso, monto_ingreso in sorted(ingresos_por_fecha.items()):
    fecha_liq_esperada = siguiente_dia_habil(fecha_ingreso)

    # Buscar liquidaciones en fecha esperada
    monto_liquidado = liquidaciones_por_fecha.get(fecha_liq_esperada, 0)

    # Verificar si hay match
    match = "✓" if monto_liquidado > 0 else "✗"

    print(f"{fecha_ingreso.strftime('%Y-%m-%d')} | ${monto_ingreso:>12,.0f} | {fecha_liq_esperada.strftime('%Y-%m-%d')} | - | ${monto_liquidado:>12,.0f} | {match}")

    if monto_liquidado == 0:
        anomalias_timing.append({
            'fecha_ingreso': fecha_ingreso,
            'monto': monto_ingreso,
            'fecha_esperada': fecha_liq_esperada
        })

# 5. Análisis de anomalías
print("\n5. ANOMALÍAS DETECTADAS")
print("-" * 40)

anomalias = []

# 5.1 Montos muy pequeños (posibles errores)
montos_pequenos = df[df['amount'].abs() < 50]
if len(montos_pequenos) > 0:
    print(f"\n5.1 Movimientos con montos muy pequeños (<$50):")
    for _, row in montos_pequenos.iterrows():
        print(f"   - {row['date'].strftime('%Y-%m-%d')}: {row['description']} -> ${row['amount']:,.0f}")
    anomalias.append(f"{len(montos_pequenos)} movimientos con montos muy pequeños")

# 5.2 Verificar si ingresos = liquidaciones (conciliación)
print(f"\n5.2 Conciliación General:")
diferencia = total_ingresos - total_liquidaciones
print(f"   Total Ingresos: ${total_ingresos:,.0f}")
print(f"   Total Liquidaciones: ${total_liquidaciones:,.0f}")
print(f"   Diferencia: ${diferencia:,.0f}")
if diferencia != 0:
    anomalias.append(f"Descuadre de ${diferencia:,.0f} CLP entre ingresos y liquidaciones")

# 5.3 Buscar ingresos específicos que no cuadran con liquidaciones
print(f"\n5.3 Análisis detallado de conciliación por fecha:")

# Crear timeline de movimientos
timeline = df.sort_values('date').copy()
timeline['running_balance'] = timeline['amount'].cumsum()

print("\nBalance acumulado por fecha:")
balance_por_fecha = timeline.groupby('date').agg({
    'amount': 'sum',
    'running_balance': 'last'
}).sort_index()
balance_por_fecha.columns = ['Movimiento del día', 'Balance acumulado']
print(balance_por_fecha.to_string())

# 5.4 Buscar descuadres específicos por monto
print(f"\n5.4 Verificación de montos específicos (Ingreso vs Liquidación):")

# Comparar montos de ingresos con montos de liquidaciones
montos_ingreso = set(ingresos['amount'].values)
montos_liquidacion = set(abs(liquidaciones['amount'].values))

ingresos_sin_match = montos_ingreso - montos_liquidacion
if ingresos_sin_match:
    print(f"   Montos de ingreso sin liquidación exacta correspondiente:")
    for monto in sorted(ingresos_sin_match, reverse=True)[:10]:
        registro = ingresos[ingresos['amount'] == monto].iloc[0]
        print(f"   - ${monto:,.0f} ({registro['date'].strftime('%Y-%m-%d')}) - {registro['banco']}")

# 5.5 Buscar el descuadre específico
print(f"\n5.5 Buscando origen del descuadre de ${diferencia:,.0f}:")

# El ingreso de Banco Santander el 01/09 es 3,286,922 pero la liquidación a NoPayments el 02/09 es 3,286,820
# Diferencia: 102
santander_sep01 = ingresos[(ingresos['date'] == '2022-09-01') & (ingresos['banco'].str.contains('Santander', na=False))]
if len(santander_sep01) > 0:
    print(f"   Ingreso Santander 01/09: ${santander_sep01['amount'].values[0]:,.0f}")

nopayments_sep02 = liquidaciones[(liquidaciones['date'] == '2022-09-02') & (liquidaciones['comercio'] == 'NoPayments')]
if len(nopayments_sep02) > 0:
    total_nopayments_sep02 = abs(nopayments_sep02['amount'].sum())
    print(f"   Liquidaciones NoPayments 02/09: ${total_nopayments_sep02:,.0f}")

# Verificar BCI
bci_sep08 = ingresos[(ingresos['date'] == '2022-09-08') & (ingresos['banco'].str.contains('Inversiones', na=False))]
if len(bci_sep08) > 0:
    print(f"   Ingreso BCI 08/09: ${bci_sep08['amount'].values[0]:,.0f}")

# 6. Resumen de anomalías
print("\n" + "=" * 80)
print("RESUMEN DE ANOMALÍAS")
print("=" * 80)
for i, a in enumerate(anomalias, 1):
    print(f"{i}. {a}")

# Anomalía específica del descuadre
print(f"\nDETALLE DEL DESCUADRE:")
print(f"El ingreso de Banco Santander del 01/09/2022 es de $3,286,922")
print(f"Sin embargo, la liquidación correspondiente a NoPayments del 02/09/2022 es de $3,286,820")
print(f"Diferencia: $102 (que coincide con una liquidación a 'Mirador San Juan' de -$102 el mismo día)")
