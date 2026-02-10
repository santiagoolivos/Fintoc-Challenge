#!/usr/bin/env python3
"""
Script de Generación de Reportes - Débito Directo Fintoc
=========================================================

Este script analiza la cartola de débito directo y genera reportes
automatizados en diferentes formatos.

Uso:
    python generar_reporte.py [opciones]

Opciones:
    --formato [ejecutivo|detallado|mixto|todos]  Formato del reporte (default: todos)
    --output [directorio]                         Directorio de salida (default: outputs)
    --csv                                         Exportar también tablas en CSV

Ejemplos:
    python generar_reporte.py
    python generar_reporte.py --formato ejecutivo
    python generar_reporte.py --formato todos --csv
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import argparse
import os
import sys


class AnalizadorDebitoDirecto:
    """Clase principal para analizar la cartola de débito directo"""

    def __init__(self, archivo_csv):
        """Inicializa el analizador con el archivo CSV"""
        self.df = pd.read_csv(archivo_csv)
        self.df['date'] = pd.to_datetime(self.df['date'])
        self._clasificar_movimientos()
        self._calcular_metricas()

    def _clasificar_movimientos(self):
        """Clasifica los movimientos en ingresos y liquidaciones"""
        self.df['tipo_movimiento'] = self.df['description'].apply(
            lambda x: 'INGRESO_PAC' if 'Ingreso por PAC' in x else 'LIQUIDACION'
        )

        self.df['banco'] = self.df['description'].apply(
            lambda x: x.replace('Ingreso por PAC Multibanco ', '')
                       .replace('Ingreso por PAC Multibco.', '')
            if 'Ingreso por PAC' in x else None
        )

        self.df['comercio'] = self.df['description'].apply(
            lambda x: x.replace('Liquidacion a: ', '')
            if 'Liquidacion a:' in x else None
        )

        self.ingresos = self.df[self.df['tipo_movimiento'] == 'INGRESO_PAC'].copy()
        self.liquidaciones = self.df[self.df['tipo_movimiento'] == 'LIQUIDACION'].copy()

    def _calcular_metricas(self):
        """Calcula las métricas principales"""
        self.total_ingresos = self.ingresos['amount'].sum()
        self.total_liquidaciones = abs(self.liquidaciones['amount'].sum())
        self.diferencia = self.total_ingresos - self.total_liquidaciones
        self.num_ingresos = len(self.ingresos)
        self.num_liquidaciones = len(self.liquidaciones)

    def _siguiente_dia_habil(self, fecha):
        """Calcula el siguiente día hábil"""
        siguiente = fecha + timedelta(days=1)
        while siguiente.weekday() >= 5:
            siguiente += timedelta(days=1)
        return siguiente

    def obtener_resumen(self):
        """Retorna el resumen general"""
        return {
            'total_ingresos': self.total_ingresos,
            'total_liquidaciones': self.total_liquidaciones,
            'diferencia': self.diferencia,
            'num_ingresos': self.num_ingresos,
            'num_liquidaciones': self.num_liquidaciones
        }

    def obtener_por_banco(self):
        """Retorna el análisis por banco"""
        return self.ingresos.groupby('banco').agg(
            Total=('amount', 'sum'),
            Cantidad=('amount', 'count')
        ).sort_values('Total', ascending=False)

    def obtener_por_comercio(self):
        """Retorna el análisis por comercio"""
        return self.liquidaciones.groupby('comercio').agg(
            Total=('amount', lambda x: abs(x.sum())),
            Cantidad=('amount', 'count')
        ).sort_values('Total', ascending=False)

    def verificar_flujo(self):
        """Verifica el flujo ingreso -> liquidación"""
        ingresos_por_fecha = self.ingresos.groupby('date')['amount'].sum().to_dict()
        liquidaciones_por_fecha = self.liquidaciones.groupby('date')['amount'].sum().abs().to_dict()

        verificacion = []
        for fecha_ingreso, monto_ingreso in sorted(ingresos_por_fecha.items()):
            fecha_liq_esperada = self._siguiente_dia_habil(fecha_ingreso)
            monto_liquidado = liquidaciones_por_fecha.get(fecha_liq_esperada, 0)

            verificacion.append({
                'fecha_ingreso': fecha_ingreso,
                'monto_ingreso': monto_ingreso,
                'fecha_liq_esperada': fecha_liq_esperada,
                'monto_liquidado': monto_liquidado,
                'estado': 'OK' if abs(monto_ingreso - monto_liquidado) < 100000 else 'ERROR'
            })

        return pd.DataFrame(verificacion)

    def detectar_anomalias(self):
        """Detecta anomalías en los datos"""
        anomalias = []

        # Anomalía 1: Descuadre
        if self.diferencia != 0:
            anomalias.append({
                'id': 1,
                'tipo': 'Descuadre financiero',
                'descripcion': f'Diferencia de ${abs(self.diferencia):,.0f} entre ingresos y liquidaciones',
                'impacto': f'${abs(self.diferencia):,.0f} CLP'
            })

        # Anomalía 2: Montos pequeños
        montos_pequenos = self.df[self.df['amount'].abs() < 50]
        if len(montos_pequenos) > 0:
            anomalias.append({
                'id': 2,
                'tipo': 'Montos atípicos',
                'descripcion': f'{len(montos_pequenos)} movimientos con montos < $50',
                'impacto': f'{len(montos_pequenos)} movimientos'
            })

        # Anomalía 3: Comercios duplicados
        comercios = self.liquidaciones['comercio'].dropna().unique()
        comercios_lower = {}
        for c in comercios:
            key = c.lower()
            if key in comercios_lower:
                comercios_lower[key].append(c)
            else:
                comercios_lower[key] = [c]

        duplicados = [v for v in comercios_lower.values() if len(v) > 1]
        if duplicados:
            anomalias.append({
                'id': 3,
                'tipo': 'Calidad de datos',
                'descripcion': f'Comercios con nombres duplicados: {duplicados}',
                'impacto': 'Data Quality'
            })

        return anomalias

    def obtener_montos_pequenos(self):
        """Retorna los movimientos con montos pequeños"""
        return self.df[self.df['amount'].abs() < 50][['date', 'description', 'amount']]


class GeneradorReportes:
    """Genera reportes en diferentes formatos"""

    def __init__(self, analizador: AnalizadorDebitoDirecto):
        self.analizador = analizador
        self.resumen = analizador.obtener_resumen()

    def generar_ejecutivo(self):
        """Genera reporte en formato ejecutivo"""
        anomalias = self.analizador.detectar_anomalias()

        reporte = f"""
================================================================================
CIERRE CONTABLE DÉBITO DIRECTO | Ago 08 - Sep 14 | FORMATO EJECUTIVO
================================================================================

RESUMEN FINANCIERO
------------------
Total Ingresos PAC:     ${self.resumen['total_ingresos']:>15,.0f} CLP ({self.resumen['num_ingresos']} movimientos)
Total Liquidaciones:    ${self.resumen['total_liquidaciones']:>15,.0f} CLP ({self.resumen['num_liquidaciones']} movimientos)
Descuadre:              ${self.resumen['diferencia']:>15,.0f} CLP

¿SE CONDICE CON EL FUNCIONAMIENTO DEL PRODUCTO?
-----------------------------------------------
En general SÍ. El flujo esperado (Ingreso día N → Liquidación día N+1 hábil)
se cumple en la mayoría de los casos. Sin embargo, hay excepciones que generan
el descuadre detectado.

ANOMALÍAS DETECTADAS
--------------------
"""
        for i, a in enumerate(anomalias, 1):
            reporte += f"{i}. {a['tipo'].upper()}: {a['descripcion']}\n"

        reporte += """
================================================================================
"""
        return reporte

    def generar_detallado(self):
        """Genera reporte en formato detallado"""
        por_banco = self.analizador.obtener_por_banco()
        por_comercio = self.analizador.obtener_por_comercio()
        verificacion = self.analizador.verificar_flujo()
        anomalias = self.analizador.detectar_anomalias()

        reporte = f"""
================================================================================
CIERRE CONTABLE DÉBITO DIRECTO | Ago 08 - Sep 14 | FORMATO DETALLADO
================================================================================

1. RESUMEN EJECUTIVO
--------------------
Total Ingresos PAC:     ${self.resumen['total_ingresos']:>15,.0f} CLP ({self.resumen['num_ingresos']} movimientos)
Total Liquidaciones:    ${self.resumen['total_liquidaciones']:>15,.0f} CLP ({self.resumen['num_liquidaciones']} movimientos)
Balance Final:          ${self.resumen['diferencia']:>15,.0f} CLP {'(DESCUADRE)' if self.resumen['diferencia'] != 0 else ''}

2. INGRESOS POR BANCO
---------------------
{por_banco.to_string()}

3. LIQUIDACIONES POR COMERCIO
-----------------------------
{por_comercio.to_string()}

4. VERIFICACIÓN DEL FLUJO
-------------------------
{verificacion.to_string(index=False)}

5. ANOMALÍAS DETECTADAS
-----------------------
"""
        for a in anomalias:
            reporte += f"\nAnomalía #{a['id']}: {a['tipo']}\n"
            reporte += f"  Descripción: {a['descripcion']}\n"
            reporte += f"  Impacto: {a['impacto']}\n"

        reporte += """
================================================================================
"""
        return reporte

    def generar_mixto(self):
        """Genera reporte en formato mixto (ejecutivo + anexos)"""
        anomalias = self.analizador.detectar_anomalias()
        por_banco = self.analizador.obtener_por_banco()
        por_comercio = self.analizador.obtener_por_comercio()
        montos_pequenos = self.analizador.obtener_montos_pequenos()

        reporte = f"""
================================================================================
CIERRE CONTABLE DÉBITO DIRECTO | Ago 08 - Sep 14 | FORMATO MIXTO
================================================================================

CIFRAS CLAVE
------------
Ingresos:      ${self.resumen['total_ingresos']:>15,.0f} CLP
Liquidaciones: ${self.resumen['total_liquidaciones']:>15,.0f} CLP
Descuadre:     ${self.resumen['diferencia']:>15,.0f} CLP

¿SE CONDICE CON EL FUNCIONAMIENTO DEL PRODUCTO?
-----------------------------------------------
PARCIALMENTE. El flujo general se cumple en la mayoría de los casos.
Las excepciones generan el descuadre detectado.

ANOMALÍAS DETECTADAS ({len(anomalias)})
-----------------------
"""
        for a in anomalias:
            reporte += f"  #{a['id']} {a['tipo']}: {a['impacto']} (Ver Anexo {chr(64 + a['id'])})\n"

        reporte += f"""

================================================================================
ANEXO A: INGRESOS POR BANCO
================================================================================
{por_banco.to_string()}

================================================================================
ANEXO B: LIQUIDACIONES POR COMERCIO
================================================================================
{por_comercio.to_string()}

================================================================================
ANEXO C: MOVIMIENTOS ATÍPICOS
================================================================================
{montos_pequenos.to_string(index=False)}

================================================================================
"""
        return reporte


def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description='Genera reportes de análisis de cartola de débito directo'
    )
    parser.add_argument(
        '--formato',
        choices=['ejecutivo', 'detallado', 'mixto', 'todos'],
        default='todos',
        help='Formato del reporte (default: todos)'
    )
    parser.add_argument(
        '--output',
        default='outputs',
        help='Directorio de salida (default: outputs)'
    )
    parser.add_argument(
        '--csv',
        action='store_true',
        help='Exportar también tablas en CSV'
    )
    parser.add_argument(
        '--input',
        default='inputs/debito_directo.csv',
        help='Archivo CSV de entrada (default: inputs/debito_directo.csv)'
    )

    args = parser.parse_args()

    # Verificar que existe el archivo de entrada
    if not os.path.exists(args.input):
        print(f"Error: No se encontró el archivo {args.input}")
        sys.exit(1)

    # Crear directorio de salida si no existe
    os.makedirs(args.output, exist_ok=True)

    # Inicializar analizador y generador
    print(f"Analizando {args.input}...")
    analizador = AnalizadorDebitoDirecto(args.input)
    generador = GeneradorReportes(analizador)

    # Generar reportes según formato seleccionado
    formatos = {
        'ejecutivo': generador.generar_ejecutivo,
        'detallado': generador.generar_detallado,
        'mixto': generador.generar_mixto
    }

    if args.formato == 'todos':
        for nombre, funcion in formatos.items():
            reporte = funcion()
            archivo = os.path.join(args.output, f'reporte_{nombre}.txt')
            with open(archivo, 'w', encoding='utf-8') as f:
                f.write(reporte)
            print(f"Generado: {archivo}")
    else:
        reporte = formatos[args.formato]()
        archivo = os.path.join(args.output, f'reporte_{args.formato}.txt')
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(reporte)
        print(f"Generado: {archivo}")

    # Exportar CSVs si se solicita
    if args.csv:
        print("\nExportando tablas CSV...")

        analizador.obtener_por_banco().to_csv(
            os.path.join(args.output, 'analisis_por_banco.csv')
        )
        print(f"  - {args.output}/analisis_por_banco.csv")

        analizador.obtener_por_comercio().to_csv(
            os.path.join(args.output, 'analisis_por_comercio.csv')
        )
        print(f"  - {args.output}/analisis_por_comercio.csv")

        analizador.verificar_flujo().to_csv(
            os.path.join(args.output, 'verificacion_flujo.csv'),
            index=False
        )
        print(f"  - {args.output}/verificacion_flujo.csv")

        analizador.obtener_montos_pequenos().to_csv(
            os.path.join(args.output, 'movimientos_atipicos.csv'),
            index=False
        )
        print(f"  - {args.output}/movimientos_atipicos.csv")

    print("\n¡Proceso completado exitosamente!")

    # Mostrar resumen
    resumen = analizador.obtener_resumen()
    print(f"\nResumen:")
    print(f"  - Total Ingresos: ${resumen['total_ingresos']:,.0f}")
    print(f"  - Total Liquidaciones: ${resumen['total_liquidaciones']:,.0f}")
    print(f"  - Descuadre: ${resumen['diferencia']:,.0f}")


if __name__ == '__main__':
    main()
