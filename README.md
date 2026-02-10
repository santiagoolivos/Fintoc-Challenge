# Desafío Técnico Fintoc - Product Operations

Soluciones al desafío técnico de Product Operations de Fintoc.

---

## Estructura del Repositorio

```
.
├── README.md
├── parte-1/                  # Integración API Transferencias (Node.js)
│   ├── src/
│   │   ├── index.js              # Entry point con CLI
│   │   ├── fintoc-client.js      # Cliente API de Fintoc
│   │   ├── transfer-service.js   # Lógica de transferencias
│   │   ├── report-generator.js   # Generador de reportes
│   │   └── utils/
│   │       └── logger.js
│   ├── outputs/
│   │   └── transfers_*.json
│   ├── package.json
│   ├── .env.example
│   └── README.md
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
Script CLI para ejecutar transferencias de alto monto a través de la API de Fintoc (Treasury API), dividiendo automáticamente el monto total en transferencias de máximo $7.000.000 CLP.

### Cómo ejecutar

```bash
cd parte-1

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Ejecutar transferencia
npm run transfer -- \
  --amount 500000000 \
  --rut "20163891-7" \
  --name "Juan Pérez" \
  --account "123456789" \
  --bank "cl_banco_santander" \
  --type "checking_account" \
  --comment "Pago factura"
```

### Parámetros

| Parámetro | Requerido | Descripción |
|-----------|-----------|-------------|
| `--amount` | Sí | Monto total a transferir en CLP |
| `--rut` | Sí | RUT del destinatario |
| `--name` | Sí | Nombre completo del destinatario |
| `--account` | Sí | Número de cuenta del destinatario |
| `--bank` | Sí | ID del banco (ej: `cl_banco_santander`) |
| `--type` | Sí | Tipo de cuenta: `checking_account` o `sight_account` |
| `--comment` | No | Comentario para las transferencias |
| `--reference-id` | No | ID de referencia (solo México) |

### Dónde encontrar la respuesta
```
parte-1/outputs/transfers_*.json
```

video solución parte 1: [https://www.loom.com/share/a4a2e5d4735943d4a8a8e065f4a735cb](https://www.loom.com/share/a4a2e5d4735943d4a8a8e065f4a735cb)

Ver [parte-1/README.md](./parte-1/README.md) para documentación completa.

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

### Parte 1 (Node.js)
- Node.js 18+
- Cuenta de Fintoc con API Key
- Par de llaves JWS

### Parte 2 (Python)
- Python 3.11+
- pandas
- ipykernel
