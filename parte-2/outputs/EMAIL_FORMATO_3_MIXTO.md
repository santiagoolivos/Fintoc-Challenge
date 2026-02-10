# Email Formato 3: Mixto

**Uso recomendado:** Email ejecutivo con anexos detallados para referencia.

---

**Asunto:** Cierre Contable Débito Directo | Ago 08 - Sep 14 | Ver Anexos

---

Hola [Nombre],

Completé la revisión de la cartola de Débito Directo. A continuación el resumen ejecutivo; los detalles completos están en los anexos adjuntos.

## CIFRAS CLAVE

| Concepto | Monto |
|----------|-------|
| Ingresos | $15,342,256 CLP |
| Liquidaciones | $15,352,260 CLP |
| **Descuadre** | **$-10,004 CLP** |

## ¿SE CONDICE CON EL FUNCIONAMIENTO DEL PRODUCTO?

**PARCIALMENTE.** El flujo general (Ingreso D → Liquidación D+1 hábil) se cumple en 8 de 11 fechas de ingreso. Las 3 excepciones generan el descuadre detectado.

## ANOMALÍAS DETECTADAS (4)

| # | Tipo | Impacto | Detalle |
|---|------|---------|---------|
| 1 | Liquidaciones sin PAC | $9,990 | Anexo A |
| 2 | Split incorrecto | $102 | Anexo B |
| 3 | Comercios duplicados | Data Issue | Anexo C |
| 4 | Montos atípicos (<$50) | 12 movs | Anexo D |

## SIGUIENTE PASO SUGERIDO

Agendar 15 min para revisar Anomalía #1 (liquidaciones del 31/08 sin ingreso).

---

## ANEXOS

- **Anexo A:** Detalle descuadre 31/08
- **Anexo B:** Análisis split Santander-NoPayments
- **Anexo C:** Lista comercios duplicados
- **Anexo D:** Movimientos atípicos
- **Anexo E:** Timeline completo de saldos
- **Anexo F:** Tablas de conciliación por banco y comercio

Saludos,
[Tu nombre]

---

# ANEXO A: DETALLE DESCUADRE 31/08

**Ingreso previo (30/08):** $40 de Banco Falabella

**Liquidaciones 31/08 sin respaldo:**

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

**Cálculo:**
- Total liquidado: $10,030
- Menos ingreso disponible: -$40
- **Descuadre: $9,990**

---

# ANEXO B: ANÁLISIS SPLIT SANTANDER-NOPAYMENTS (02/09)

| Campo | Valor |
|-------|-------|
| Ingreso 01/09 Banco Santander | $3,286,922 |
| Liquidación 02/09 a NoPayments | $3,286,820 |
| **Diferencia** | **$102** |

La diferencia aparece como liquidación separada a "Mirador San Juan" ($102).

**Verificar:** ¿El split es correcto o hubo error en asignación?

---

# ANEXO C: COMERCIOS CON NOMBRES DUPLICADOS

## 1. Roots Housing

| Variante | Monto | Movimientos |
|----------|-------|-------------|
| Roots Housing SPA | $8,265 | 1 |
| Roots Housing Spa | $1,876 | 3 |

## 2. Smart Finances

| Variante | Monto | Movimientos |
|----------|-------|-------------|
| Smart Finances SPA | $1,739 | 1 |
| Smart Finances SpA | $8,265 | 1 |

---

# ANEXO D: MOVIMIENTOS ATÍPICOS (<$50)

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

---

# ANEXO E: TIMELINE COMPLETO DE SALDOS

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

# ANEXO F: TABLAS DE CONCILIACIÓN

## Por Banco

| Banco | Total | Cantidad |
|-------|-------|----------|
| Banco Santander | $5,961,579 | 6 |
| Bco. Crédito e Inversiones | $4,251,225 | 4 |
| Banco Del Estado | $2,270,154 | 5 |
| Bank Boston N.A. | $1,392,341 | 4 |
| Banco Falabella | $848,250 | 5 |
| Banco Sud Americano | $618,707 | 2 |
| **TOTAL** | **$15,342,256** | **26** |

## Por Comercio

| Comercio | Total | Cantidad |
|----------|-------|----------|
| NoPayments | $10,657,027 | 16 |
| Tesla | $1,353,581 | 4 |
| Mirador San Juan | $1,342,810 | 3 |
| Seguros Asesorados Ltda | $979,536 | 4 |
| Constructora e Inmobiliaria Partners | $575,640 | 3 |
| Inmobiliaria Ruiz-Tagle SPA | $237,346 | 3 |
| SALON SPA ESPINOSA | $186,165 | 3 |
| Otros (5 comercios) | $21,961 | 7 |
| **TOTAL** | **$15,352,260** | **44** |

---

*Tiempo de lectura email principal: 2 minutos*
*Tiempo de lectura con anexos: 10 minutos*
