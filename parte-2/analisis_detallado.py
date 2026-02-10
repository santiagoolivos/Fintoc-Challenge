"""
Análisis detallado para encontrar el origen del descuadre
"""

import pandas as pd
from datetime import datetime, timedelta

df = pd.read_csv('/Users/santiagoolivos/Desktop/Yo/Proyectos externos/Desafío Fintoc/parte-2/inputs/debito_directo.csv')
df['date'] = pd.to_datetime(df['date'])

df['tipo'] = df['description'].apply(
    lambda x: 'INGRESO' if 'Ingreso por PAC' in x else 'LIQUIDACION'
)

print("=" * 80)
print("ANÁLISIS DETALLADO DEL DESCUADRE")
print("=" * 80)

# Análisis día por día
print("\nMOVIMIENTOS DÍA A DÍA:")
print("-" * 80)

for fecha in sorted(df['date'].unique()):
    movs_dia = df[df['date'] == fecha]
    ingresos_dia = movs_dia[movs_dia['tipo'] == 'INGRESO']['amount'].sum()
    liquidaciones_dia = abs(movs_dia[movs_dia['tipo'] == 'LIQUIDACION']['amount'].sum())

    print(f"\n{fecha.strftime('%Y-%m-%d')} ({fecha.strftime('%A')}):")

    if ingresos_dia > 0:
        print(f"  INGRESOS: ${ingresos_dia:,.0f}")
        for _, row in movs_dia[movs_dia['tipo'] == 'INGRESO'].iterrows():
            banco = row['description'].replace('Ingreso por PAC Multibanco ', '').replace('Ingreso por PAC Multibco.', '')
            print(f"    + ${row['amount']:>12,.0f} <- {banco}")

    if liquidaciones_dia > 0:
        print(f"  LIQUIDACIONES: ${liquidaciones_dia:,.0f}")
        for _, row in movs_dia[movs_dia['tipo'] == 'LIQUIDACION'].iterrows():
            comercio = row['description'].replace('Liquidacion a: ', '')
            print(f"    - ${abs(row['amount']):>12,.0f} -> {comercio}")

# Buscar específicamente el descuadre
print("\n" + "=" * 80)
print("BUSCANDO EL DESCUADRE DE $10,004")
print("=" * 80)

# El 30/08 hay un ingreso de $40 pero el 31/08 las liquidaciones suman $10,030
# Diferencia: $9,990
print("\n1. Análisis 30-31 Agosto:")
ing_30 = df[(df['date'] == '2022-08-30') & (df['tipo'] == 'INGRESO')]['amount'].sum()
liq_31 = abs(df[(df['date'] == '2022-08-31') & (df['tipo'] == 'LIQUIDACION')]['amount'].sum())
ing_31 = df[(df['date'] == '2022-08-31') & (df['tipo'] == 'INGRESO')]['amount'].sum()

print(f"   Ingreso 30/08: ${ing_30:,.0f}")
print(f"   Ingreso 31/08: ${ing_31:,.0f}")
print(f"   Liquidaciones 31/08: ${liq_31:,.0f}")
print(f"   Diferencia: ${(ing_30 + ing_31 - liq_31):,.0f}")

# El descuadre se origina el 31/08 donde se liquidaron $10,030 pero solo había ingresado $40
# Los $9,990 que faltan se liquidaron sin ingreso correspondiente

print("\n2. Detalle liquidaciones 31/08 sin ingreso correspondiente:")
liq_31_df = df[(df['date'] == '2022-08-31') & (df['tipo'] == 'LIQUIDACION')]
for _, row in liq_31_df.iterrows():
    comercio = row['description'].replace('Liquidacion a: ', '')
    print(f"   ${abs(row['amount']):>8,.0f} -> {comercio}")

# El otro descuadre está en 01-02 Sep
print("\n3. Análisis 01-02 Septiembre:")
ing_01 = df[(df['date'] == '2022-09-01') & (df['tipo'] == 'INGRESO')]['amount'].sum()
liq_01 = abs(df[(df['date'] == '2022-09-01') & (df['tipo'] == 'LIQUIDACION')]['amount'].sum())
liq_02 = abs(df[(df['date'] == '2022-09-02') & (df['tipo'] == 'LIQUIDACION')]['amount'].sum())

print(f"   Ingreso 01/09: ${ing_01:,.0f}")
print(f"   Liquidaciones 01/09: ${liq_01:,.0f}")
print(f"   Liquidaciones 02/09: ${liq_02:,.0f}")
print(f"   Diferencia 01/09: ${ing_01 - liq_01:,.0f}")
print(f"   Lo esperado a liquidar 02/09 (por ing 01/09): ${ing_01 - liq_01:,.0f}")
print(f"   Diferencia: ${(ing_01 - liq_01) - liq_02:,.0f}")

# Análisis de nombres duplicados de comercios
print("\n" + "=" * 80)
print("ANOMALÍA: COMERCIOS CON NOMBRES DUPLICADOS")
print("=" * 80)

comercios = df[df['tipo'] == 'LIQUIDACION']['description'].apply(
    lambda x: x.replace('Liquidacion a: ', '')
).unique()

# Buscar duplicados por case-insensitive
comercios_lower = {}
for c in comercios:
    key = c.lower()
    if key in comercios_lower:
        comercios_lower[key].append(c)
    else:
        comercios_lower[key] = [c]

print("\nComercios con variaciones de nombre:")
for key, valores in comercios_lower.items():
    if len(valores) > 1:
        print(f"   {valores}")
        for v in valores:
            total = abs(df[df['description'].str.contains(v, regex=False)]['amount'].sum())
            count = len(df[df['description'].str.contains(v, regex=False)])
            print(f"      '{v}': ${total:,.0f} en {count} movimientos")

# Conclusión del descuadre
print("\n" + "=" * 80)
print("CONCLUSIÓN DEL DESCUADRE")
print("=" * 80)

# Recalcular
print("\nEl descuadre total de $10,004 se compone de:")
print("\na) Liquidaciones del 31/08 que no tienen ingreso correspondiente:")
print("   El 30/08 ingresó solo $40 (Banco Falabella)")
print("   El 31/08 se liquidaron:")
liq_31_total = 0
for _, row in liq_31_df.iterrows():
    comercio = row['description'].replace('Liquidacion a: ', '')
    monto = abs(row['amount'])
    liq_31_total += monto

print(f"   Total liquidado 31/08: ${liq_31_total:,.0f}")
print(f"   Diferencia (40 - {liq_31_total}): ${40 - liq_31_total:,.0f}")

print("\nb) Sin embargo, el 31/08 también hubo ingresos de $847,860")
print("   que se liquidaron correctamente el 01/09 por $847,860")

# Timeline completo
print("\n" + "=" * 80)
print("TIMELINE COMPLETO DE SALDOS")
print("=" * 80)

df_sorted = df.sort_values('date')
balance = 0
print(f"\n{'Fecha':<12} {'Descripción':<50} {'Monto':>15} {'Balance':>15}")
print("-" * 95)

for _, row in df_sorted.iterrows():
    balance += row['amount']
    desc = row['description'][:48]
    print(f"{row['date'].strftime('%Y-%m-%d'):<12} {desc:<50} {row['amount']:>15,.0f} {balance:>15,.0f}")

print("\n" + "=" * 80)
print(f"BALANCE FINAL: ${balance:,.0f}")
print("=" * 80)
