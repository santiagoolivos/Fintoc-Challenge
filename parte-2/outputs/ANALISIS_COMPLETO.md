# Análisis de Cartola Débito Directo

## Período: 08 de Agosto al 14 de Septiembre de 2022

---

## 1. Resumen Ejecutivo

| Concepto | Monto | Cantidad |
|----------|-------|----------|
| **Total Ingresos PAC** | $15,342,256 CLP | 26 movimientos |
| **Total Liquidaciones** | $15,352,260 CLP | 44 movimientos |
| **Descuadre** | **$-10,004 CLP** | - |

---

## 2. ¿Se Condice el Funcionamiento con los Movimientos?

### Funcionamiento Esperado del Producto

Según la documentación del producto:

1. Los usuarios suscriben un PAC para cargos recurrentes
2. Los bancos debitan de las cuentas de usuarios
3. Los bancos transfieren a Fintoc una suma agregada (**día N**)
4. Fintoc concilia y paga a comercios al **día hábil siguiente (N+1)**

### Verificación del Flujo

| Fecha Ingreso | Monto Ingreso | Fecha Liq. Esperada | Monto Liquidado | Estado |
|---------------|---------------|---------------------|-----------------|--------|
| 2022-08-08 | $962,697 | 2022-08-09 | $962,697 | ✅ OK |
| 2022-08-11 | $328,090 | 2022-08-12 | $328,090 | ✅ OK |
| 2022-08-23 | $730,426 | 2022-08-24 | $730,426 | ✅ OK |
| 2022-08-25 | $1,760,058 | 2022-08-26 | $1,760,058 | ✅ OK |
| 2022-08-30 | $40 | 2022-08-31 | $10,030 | ❌ ERROR |
| 2022-08-31 | $847,860 | 2022-09-01 | $847,860 | ✅ OK |
| 2022-09-01 | $4,709,516 | 2022-09-02 | $4,719,520 | ❌ ERROR |
| 2022-09-03 | $20 | 2022-09-05 | $20 | ✅ OK |
| 2022-09-08 | $3,562,684 | 2022-09-09 | $3,552,694 | ❌ ERROR |
| 2022-09-09 | $1,379,877 | 2022-09-12 | $1,379,877 | ✅ OK |
| 2022-09-13 | $1,060,988 | 2022-09-14 | $1,060,988 | ✅ OK |

### Conclusión

**PARCIALMENTE**. El flujo general se cumple en **8 de 11 fechas de ingreso** (73%). Las 3 excepciones generan el descuadre detectado.

---

## 3. Ingresos por Banco

| Banco | Total | Cantidad |
|-------|-------|----------|
| Banco Santander | $5,961,579 | 6 |
| Bco. Crédito e Inversiones | $4,251,225 | 4 |
| Banco Del Estado | $2,270,154 | 5 |
| Bank Boston N.A. | $1,392,341 | 4 |
| Banco Falabella | $848,250 | 5 |
| Banco Sud Americano | $618,707 | 2 |
| **TOTAL** | **$15,342,256** | **26** |

---

## 4. Liquidaciones por Comercio

| Comercio | Total | Cantidad |
|----------|-------|----------|
| NoPayments | $10,657,027 | 16 |
| Tesla | $1,353,581 | 4 |
| Mirador San Juan | $1,342,810 | 3 |
| Seguros Asesorados Ltda | $979,536 | 4 |
| Constructora e Inmobiliaria Partners | $575,640 | 3 |
| Inmobiliaria Ruiz-Tagle SPA | $237,346 | 3 |
| SALON SPA ESPINOSA | $186,165 | 3 |
| Roots Housing SPA | $8,265 | 1 |
| Smart Finances SpA | $8,265 | 1 |
| Roots Housing Spa *(duplicado)* | $1,876 | 3 |
| Smart Finances SPA *(duplicado)* | $1,739 | 1 |
| Costanera Chacabuco Ltda | $6 | 1 |
| PZ Construcciones S.A. | $4 | 1 |
| **TOTAL** | **$15,352,260** | **44** |

---

## 5. Anomalías Detectadas

### Anomalía #1: Descuadre de $10,004 CLP

**Descripción:** El total de liquidaciones supera al total de ingresos.

**Origen identificado:** El 31/08/2022 se realizaron liquidaciones por $10,030 a 9 comercios diferentes, pero el único ingreso del día anterior (30/08) fue de apenas $40 de Banco Falabella.

**Detalle de liquidaciones sin respaldo (31/08):**

| Comercio | Monto |
|----------|-------|
| Smart Finances SpA | $8,265 |
| Roots Housing Spa | $1,739 |
| Tesla | $6 |
| Costanera Chacabuco Ltda | $6 |
| Mirador San Juan | $4 |
| PZ Construcciones S.A. | $4 |
| Seguros Asesorados Ltda | $2 |
| SALON SPA ESPINOSA | $2 |
| Inmobiliaria Ruiz-Tagle SPA | $2 |
| **TOTAL** | **$10,030** |

**Cálculo del descuadre:**
- Total liquidado 31/08: $10,030
- Ingreso disponible (30/08): $40
- **Descuadre parcial: $9,990**

---

### Anomalía #2: Diferencia en Liquidación Santander → NoPayments

| Campo | Valor |
|-------|-------|
| Fecha ingreso | 01/09/2022 |
| Monto ingreso Santander | $3,286,922 |
| Fecha liquidación | 02/09/2022 |
| Monto liquidación NoPayments | $3,286,820 |
| **Diferencia** | **$102** |

**Observación:** La diferencia de $102 aparece como liquidación separada a "Mirador San Juan" el mismo día 02/09.

**Posible causa:** Error en la asignación del comercio destino o split incorrecto de la liquidación.

---

### Anomalía #3: Comercios con Nombres Duplicados (Data Quality)

Se detectaron comercios registrados con variaciones de capitalización:

| Variante 1 | Monto | Variante 2 | Monto |
|------------|-------|------------|-------|
| Roots Housing SPA | $8,265 (1 mov) | Roots Housing Spa | $1,876 (3 mov) |
| Smart Finances SPA | $1,739 (1 mov) | Smart Finances SpA | $8,265 (1 mov) |

**Recomendación:** Normalizar nombres en el sistema de registro.

---

### Anomalía #4: Movimientos de Montos Atípicos

12 movimientos con montos inferiores a $50:

| Fecha | Descripción | Monto |
|-------|-------------|-------|
| 2022-08-30 | Ingreso Banco Falabella | $40 |
| 2022-08-31 | Liquidación Tesla | $-6 |
| 2022-08-31 | Liquidación Costanera Chacabuco | $-6 |
| 2022-08-31 | Liquidación Mirador San Juan | $-4 |
| 2022-08-31 | Liquidación PZ Construcciones | $-4 |
| 2022-08-31 | Liquidación Seguros Asesorados | $-2 |
| 2022-08-31 | Liquidación SALON SPA ESPINOSA | $-2 |
| 2022-08-31 | Liquidación Inmob. Ruiz-Tagle | $-2 |
| 2022-08-24 | Liquidación Roots Housing Spa | $-34 |
| 2022-09-03 | Ingreso BCI **(SÁBADO)** | $20 |
| 2022-09-05 | Liquidación Inmob. Ruiz-Tagle | $-20 |
| 2022-09-09 | Liquidación NoPayments | $-10 |

**Observación adicional:** El ingreso del 03/09 ocurrió en día sábado, lo cual es atípico para transferencias bancarias.

---

## 6. Timeline de Saldos

### Puntos Críticos

```
08/08: Balance $962,697 (ingreso Santander)
09/08: Balance $0 (liquidación completa)
...
30/08: Balance $40 (ingreso Falabella)
31/08: Balance -$9,990 ⚠️ PRIMER NEGATIVO (liquidaciones sin respaldo)
31/08: Balance $837,870 (recupera con ingresos Santander + BancoEstado)
01/09: Balance -$9,990 ⚠️ (vuelve a negativo post liquidaciones)
...
14/09: Balance -$10,004 ⚠️ CIERRE NEGATIVO
```

### Balance Acumulado por Fecha

| Fecha | Movimiento del día | Balance Acumulado |
|-------|-------------------|-------------------|
| 2022-08-08 | $962,697 | $962,697 |
| 2022-08-09 | -$962,697 | $0 |
| 2022-08-11 | $328,090 | $328,090 |
| 2022-08-12 | -$328,090 | $0 |
| 2022-08-23 | $730,426 | $730,426 |
| 2022-08-24 | -$730,426 | $0 |
| 2022-08-25 | $1,760,058 | $1,760,058 |
| 2022-08-26 | -$1,760,058 | $0 |
| 2022-08-30 | $40 | $40 |
| 2022-08-31 | $837,830 | $837,870 |
| 2022-09-01 | $3,861,656 | $4,699,526 |
| 2022-09-02 | -$4,719,520 | **-$19,994** |
| 2022-09-03 | $20 | -$19,974 |
| 2022-09-05 | -$20 | -$19,994 |
| 2022-09-08 | $3,562,684 | $3,542,690 |
| 2022-09-09 | -$2,172,817 | $1,369,873 |
| 2022-09-12 | -$1,379,877 | **-$10,004** |
| 2022-09-13 | $1,060,988 | $1,050,984 |
| 2022-09-14 | -$1,060,988 | **-$10,004** |

---

## 7. Conclusiones y Recomendaciones

### Conclusiones

1. **El flujo general del producto funciona correctamente** en la mayoría de los casos (73%)
2. **Existe un descuadre de $10,004** que debe ser investigado
3. **La calidad de datos presenta problemas** con nombres de comercios duplicados
4. **Hay movimientos atípicos** que podrían ser pruebas de sistema

### Recomendaciones

1. **Investigar urgente** el origen de las liquidaciones del 31/08 sin ingreso asociado
2. **Revisar** la diferencia de $102 entre ingreso Santander y liquidación NoPayments
3. **Normalizar** nombres de comercios en el sistema para evitar duplicados
4. **Evaluar** si los movimientos de montos pequeños (<$50) corresponden a pruebas
5. **Verificar** por qué hubo un ingreso en día sábado (03/09)

---

*Análisis generado el: 2024*
*Herramientas utilizadas: Python, Pandas*
