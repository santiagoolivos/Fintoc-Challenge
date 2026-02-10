# Desafío Técnico Fintoc - Product Operations

Soluciones al desafío técnico de Product Operations de Fintoc.

---

## Estructura del Repositorio

```
.
├── README.md
├── parte-1/                  # Integración API Transferencias
│   ├── main.py
│   ├── requirements.txt
│   ├── README.md
│   └── outputs/
│       └── transfers_*.json
│
└── parte-2/                  # Análisis Cartola Débito Directo
    ├── analisis_debito_directo.ipynb
    ├── inputs/
    │   └── debito_directo.csv
    └── outputs/
        ├── email_final.txt           <- RESPUESTA PRINCIPAL
        ├── reporte_consolidado.json
        └── conclusiones.txt
```

---

## Parte 1: Integración API de Transferencias

### Objetivo
Implementar un cliente que consuma la API de transferencias de Fintoc, autenticando con JWS (JSON Web Signature), y obtenga las transferencias del mes de julio 2022.

### Cómo ejecutar

```bash
cd parte-1

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
export FINTOC_API_KEY="tu_api_key"
export FINTOC_JWS_PRIVATE_KEY_PATH="ruta/a/private_key.pem"

# Ejecutar
python main.py
```

### Dónde encontrar la respuesta
```
parte-1/outputs/transfers_*.json
```

---

## Parte 2: Análisis Cartola Débito Directo

### Objetivo
Analizar la cartola de la cuenta de Débito Directo de Fintoc para el período 08 agosto - 14 septiembre 2022, y redactar un correo al encargado del producto respondiendo:

1. ¿Se condice el funcionamiento del producto con los movimientos de la cartola?
2. ¿Encuentras alguna anomalía?

### Cómo ejecutar

1. Abrir el notebook en VS Code o Jupyter:
   ```
   parte-2/analisis_debito_directo.ipynb
   ```

2. Seleccionar kernel Python 3.11

3. Ejecutar todas las celdas (Run All)

### Dónde encontrar la respuesta

**Email con la respuesta completa:**
```
parte-2/outputs/email_final.txt
```

**Archivos adicionales generados:**
- `reporte_consolidado.json` - Datos estructurados del análisis
- `conclusiones.txt` - Resumen ejecutivo

---

## Resumen de Hallazgos (Parte 2)

### ¿Se condice el funcionamiento con los movimientos?
**Sí.** El flujo esperado (ingreso PAC día N → liquidación día N+1 hábil) se observa consistentemente en la cartola.

### Anomalías encontradas
1. **Descuadre de $10,004 CLP** - Liquidaciones superan ingresos
2. **12 movimientos atípicos** - Montos menores a $50
3. **Nombres inconsistentes** - Comercios con variantes ("SPA" vs "Spa")

---

## Requisitos

- Python 3.11+
- pandas
- ipykernel
- requests
- python-jose
