# Análisis de Cartola Débito Directo - Fintoc

## Descripción

Este proyecto contiene herramientas para analizar la cartola de la cuenta de Débito Directo de Fintoc, correspondiente al período del 08 de Agosto al 14 de Septiembre de 2022.

## Estructura del Proyecto

```
parte-2/
├── inputs/
│   └── debito_directo.csv          # Datos originales de la cartola
├── outputs/
│   ├── ANALISIS_COMPLETO.md        # Análisis completo en markdown
│   ├── EMAIL_FORMATO_1_EJECUTIVO.md # Email formato ejecutivo
│   ├── EMAIL_FORMATO_2_DETALLADO.md # Email formato detallado
│   ├── EMAIL_FORMATO_3_MIXTO.md    # Email formato mixto con anexos
│   ├── analisis_por_banco.csv      # Tabla de ingresos por banco
│   ├── analisis_por_comercio.csv   # Tabla de liquidaciones por comercio
│   ├── verificacion_flujo.csv      # Verificación del flujo D → D+1
│   └── movimientos_atipicos.csv    # Movimientos con montos < $50
├── analisis_debito_directo.ipynb   # Jupyter Notebook interactivo
├── generar_reporte.py              # Script de generación de reportes
├── analisis_preliminar.py          # Script de análisis preliminar
├── analisis_detallado.py           # Script de análisis detallado
└── README.md                       # Este archivo
```

## Requisitos

- Python 3.7+
- pandas
- numpy
- matplotlib (opcional, para visualizaciones)
- jupyter (opcional, para el notebook)

### Instalación de dependencias

```bash
pip install pandas numpy matplotlib jupyter
```

## Uso

### 1. Jupyter Notebook (Recomendado para análisis interactivo)

El notebook `analisis_debito_directo.ipynb` permite un análisis paso a paso con visualizaciones interactivas.

```bash
# Iniciar Jupyter
jupyter notebook analisis_debito_directo.ipynb

# O usar JupyterLab
jupyter lab analisis_debito_directo.ipynb
```

El notebook incluye:
- Carga y exploración de datos
- Clasificación de movimientos
- Análisis por banco y comercio
- Verificación del flujo del producto
- Detección de anomalías
- Timeline de saldos con visualizaciones
- Exportación de resultados

### 2. Script de Generación de Reportes

El script `generar_reporte.py` genera reportes automatizados en diferentes formatos.

#### Uso básico (genera todos los formatos):

```bash
python generar_reporte.py
```

#### Generar formato específico:

```bash
# Solo formato ejecutivo
python generar_reporte.py --formato ejecutivo

# Solo formato detallado
python generar_reporte.py --formato detallado

# Solo formato mixto
python generar_reporte.py --formato mixto
```

#### Con exportación de CSVs:

```bash
python generar_reporte.py --csv
```

#### Especificar directorio de salida:

```bash
python generar_reporte.py --output mi_directorio
```

#### Especificar archivo de entrada:

```bash
python generar_reporte.py --input ruta/al/archivo.csv
```

#### Ayuda:

```bash
python generar_reporte.py --help
```

### 3. Scripts de Análisis Individual

#### Análisis preliminar:

```bash
python analisis_preliminar.py
```

Genera un resumen general con:
- Totales de ingresos y liquidaciones
- Análisis por banco y comercio
- Verificación del flujo
- Detección inicial de anomalías

#### Análisis detallado:

```bash
python analisis_detallado.py
```

Genera un análisis profundo con:
- Movimientos día a día
- Origen del descuadre
- Comercios duplicados
- Timeline completo de saldos

## Formatos de Email

### Formato 1: Ejecutivo
- Resumen conciso (1 página)
- Ideal para comunicación rápida
- Cifras clave y anomalías principales

### Formato 2: Detallado
- Análisis técnico completo
- Tablas de conciliación
- Ideal para auditoría

### Formato 3: Mixto (Recomendado)
- Email ejecutivo + anexos detallados
- Balance entre brevedad y completitud
- Profesional para cierre contable

## Hallazgos Principales

### Resumen Financiero
| Concepto | Monto |
|----------|-------|
| Total Ingresos PAC | $15,342,256 CLP |
| Total Liquidaciones | $15,352,260 CLP |
| **Descuadre** | **$-10,004 CLP** |

### Anomalías Detectadas

1. **Descuadre de $10,004**: Liquidaciones del 31/08 sin ingreso correspondiente
2. **Split incorrecto de $102**: Diferencia entre ingreso Santander y liquidación NoPayments
3. **Comercios duplicados**: Variaciones de capitalización en nombres
4. **Movimientos atípicos**: 12 transacciones con montos < $50

## Flujo del Producto

El producto de Débito Directo sigue este flujo:

```
Día N:     Banco transfiere a Fintoc (Ingreso PAC)
Día N+1:   Fintoc liquida a comercios (Liquidación)
(hábil)
```

El análisis verifica que este flujo se cumpla para cada ingreso.

## Archivos de Salida

Los archivos en `outputs/` incluyen:

| Archivo | Descripción |
|---------|-------------|
| `ANALISIS_COMPLETO.md` | Documento completo del análisis |
| `EMAIL_FORMATO_*.md` | Plantillas de email en 3 formatos |
| `analisis_por_banco.csv` | Ingresos agrupados por banco |
| `analisis_por_comercio.csv` | Liquidaciones agrupadas por comercio |
| `verificacion_flujo.csv` | Verificación D → D+1 |
| `movimientos_atipicos.csv` | Movimientos con montos pequeños |

## Notas Técnicas

- Los días hábiles excluyen sábados y domingos
- El análisis no considera feriados chilenos
- Los montos están en CLP (Pesos Chilenos)
- Los datos corresponden a agosto-septiembre 2022

## Soporte

Para preguntas sobre el análisis o los scripts, revisar la documentación en `ANALISIS_COMPLETO.md`.
