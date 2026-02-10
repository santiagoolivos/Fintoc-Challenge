# Email Formato 2: Detallado

**Uso recomendado:** Análisis técnico completo, documentación para auditoría.

---

**Asunto:** [DETALLADO] Cierre Contable Débito Directo | Ago 08 - Sep 14

---

Hola [Nombre],

A continuación el análisis completo de la cartola de Débito Directo para el cierre contable del período 08 de Agosto al 14 de Septiembre de 2022.

---

## 1. RESUMEN EJECUTIVO

| Concepto | Monto | Movimientos |
|----------|-------|-------------|
| Total Ingresos PAC | $15,342,256 CLP | 26 (de 6 bancos) |
| Total Liquidaciones | $15,352,260 CLP | 44 (a 13 comercios) |
| **Balance Final** | **$-10,004 CLP** | **(DESCUADRE)** |

---

## 2. ¿SE CONDICE EL FUNCIONAMIENTO CON LOS MOVIMIENTOS?

### Flujo esperado del producto:
- Los bancos transfieren a Fintoc el agregado de cargos PAC (día N)
- Fintoc liquida a comercios al día hábil siguiente (día N+1)

### Verificación del Flujo:

| Ingreso | Monto | Liq. Esperada | Monto Liq. | Estado |
|---------|-------|---------------|------------|--------|
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

---

## 3. INGRESOS POR BANCO

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

## 4. LIQUIDACIONES POR COMERCIO

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
| Roots Housing Spa (duplicado) | $1,876 | 3 |
| Smart Finances SPA (duplicado) | $1,739 | 1 |
| Costanera Chacabuco Ltda | $6 | 1 |
| PZ Construcciones S.A. | $4 | 1 |
| **TOTAL** | **$15,352,260** | **44** |

---

## 5. ANOMALÍAS DETECTADAS

### ANOMALÍA #1: DESCUADRE DE $10,004 CLP

**Descripción:** El total de liquidaciones supera al total de ingresos.

**Origen identificado:** El 31/08/2022 se realizaron liquidaciones por $10,030 a 9 comercios diferentes, pero el único ingreso del día anterior (30/08) fue de apenas $40 de Banco Falabella.

**Detalle de liquidaciones sin respaldo:**

| Comercio | Monto |
|----------|-------|
| Smart Finances SpA | $8,265 |
| Roots Housing Spa | $1,739 |
| Costanera Chacabuco Ltda | $6 |
| Tesla | $6 |
| Mirador San Juan | $4 |
| PZ Construcciones S.A. | $4 |
| Seguros Asesorados Ltda | $2 |
| SALON SPA ESPINOSA | $2 |
| Inmobiliaria Ruiz-Tagle SPA | $2 |
| **TOTAL SIN RESPALDO** | **$10,030 - $40 = $9,990** |

**Impacto:** $9,990 del descuadre provienen de este evento.

---

### ANOMALÍA #2: DIFERENCIA EN LIQUIDACIÓN SANTANDER → NOPAYMENTS

| Campo | Valor |
|-------|-------|
| Fecha ingreso | 01/09/2022 |
| Monto ingreso Santander | $3,286,922 |
| Fecha liquidación | 02/09/2022 |
| Monto liquidación NoPayments | $3,286,820 |
| **Diferencia** | **$102** |

La diferencia aparece como liquidación a "Mirador San Juan" ($102).

**Posible causa:** Error en la asignación del comercio destino o split incorrecto de la liquidación.

---

### ANOMALÍA #3: COMERCIOS CON NOMBRES DUPLICADOS (DATA QUALITY)

Se detectaron comercios registrados con variaciones de capitalización:

| Original | Duplicado |
|----------|-----------|
| "Roots Housing SPA" ($8,265 en 1 mov) | "Roots Housing Spa" ($1,876 en 3 mov) |
| "Smart Finances SPA" ($1,739 en 1 mov) | "Smart Finances SpA" ($8,265 en 1 mov) |

**Recomendación:** Normalizar nombres en el sistema de registro.

---

### ANOMALÍA #4: MOVIMIENTOS DE MONTOS ATÍPICOS

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

**Nota:** El ingreso del 03/09 ocurrió en sábado, día no hábil.

---

## 6. TIMELINE DE SALDOS (Puntos críticos)

El balance se vuelve negativo por primera vez el 31/08:

```
30/08: Balance $40 (ingreso Falabella)
31/08: Balance -$9,990 (liquidaciones sin respaldo)
       Recupera con ingresos de Santander y BancoEstado
01/09: Vuelve a negativo: -$9,990
...
14/09: Cierre: -$10,004
```

---

## 7. CONCLUSIONES Y RECOMENDACIONES

1. **Investigar** el origen de las liquidaciones del 31/08 sin ingreso asociado
2. **Revisar** la diferencia de $102 entre ingreso Santander y liquidación NoPayments
3. **Normalizar** nombres de comercios en el sistema
4. **Evaluar** si los movimientos de montos pequeños corresponden a pruebas

Quedo disponible para profundizar cualquier punto.

Saludos,
[Tu nombre]

---

*Tiempo de lectura estimado: 8-10 minutos*
