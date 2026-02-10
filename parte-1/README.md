# Fintoc High-Value Transfers

Script para ejecutar transferencias de alto monto a través de la API de Fintoc, dividiendo automáticamente el monto total en transferencias de máximo $7.000.000 CLP.

## Problema

En Chile, las transferencias bancarias tienen un límite máximo de $7.000.000 CLP por operación. Si necesitas transferir montos mayores (ej: $500.000.000), debes hacer múltiples transferencias manualmente.

## Solución

Este script automatiza el proceso:
1. Recibe el monto total y datos del destinatario
2. Verifica el saldo disponible en la cuenta
3. En modo test, permite simular depósitos para tener fondos
4. Calcula y ejecuta las transferencias necesarias (máx $7M cada una)
5. Consulta el estado final de cada transferencia
6. Genera un reporte JSON con los resultados

## Requisitos

- Node.js 18+
- Cuenta de Fintoc (modo test)
- API Key de Fintoc
- Par de llaves JWS (para firmar transferencias)

## Configuración

### 1. Instalar dependencias

```bash
cd parte-1
npm install
```

### 2. Generar llaves JWS

Las transferencias requieren firma JWS. Genera las llaves:

```bash
openssl genrsa -out private_key.pem 2048
openssl rsa -in private_key.pem -outform PEM -pubout -out public_key.pem
```

Sube `public_key.pem` al dashboard de Fintoc en la sección "JWS Public Keys".

### 3. Configurar variables de entorno

Copia el archivo de ejemplo y completa tus credenciales:

```bash
cp .env.example .env
```

Edita `.env`:

```env
FINTOC_API_KEY=sk_test_tu_api_key
FINTOC_BASE_URL=https://api.fintoc.com
FINTOC_JWS_PRIVATE_KEY_PATH=./private_key.pem
FINTOC_ACCOUNT_ID=acc_tu_account_id
```

Para obtener tu `FINTOC_ACCOUNT_ID`, puedes usar la API:

```bash
curl https://api.fintoc.com/v2/accounts \
  -H "Authorization: tu_api_key"
```

## Modo Test: Simular Saldo

En modo test, la cuenta de Fintoc comienza con saldo $0. Para poder realizar transferencias, necesitas agregar fondos simulados.

### Opción 1: Via Script (Recomendado)

Al ejecutar el script, si detecta saldo insuficiente en modo test, te preguntará:

```
Balance Verification
────────────────────────────────────────────────────────────
ℹ Account: Tu Cuenta
ℹ Available Balance: $0 CLP
ℹ Amount to Transfer: $500.000.000 CLP
⚠ Insufficient balance! Deficit: $500.000.000 CLP
────────────────────────────────────────────────────────────
ℹ You are in TEST MODE. You can simulate a deposit to add funds.

¿Do you want to simulate a deposit of $500.000.000 CLP? (yes/no):
```

Responde `yes` y el script simulará automáticamente el depósito antes de ejecutar las transferencias.

### Opción 2: Via Dashboard

1. Ingresa al [Dashboard de Fintoc](https://dashboard.fintoc.com)
2. Ve a Tesorería → Cuentas → Tu cuenta
3. Haz clic en el botón "Simular"
4. Ingresa el monto que deseas agregar

## Uso

### Sintaxis básica

```bash
npm run transfer -- \
  --amount 500000000 \
  --rut "12345678-9" \
  --name "Juan Pérez" \
  --account "123456789" \
  --bank "cl_banco_santander" \
  --type "checking_account"
```

### Parámetros

| Parámetro | Requerido | Descripción |
|-----------|-----------|-------------|
| `--amount` | Sí | Monto total a transferir en CLP |
| `--rut` | Sí | RUT del destinatario (ej: 12345678-9) |
| `--name` | Sí | Nombre completo del destinatario |
| `--account` | Sí | Número de cuenta del destinatario |
| `--bank` | Sí | ID del banco (ver lista abajo) |
| `--type` | Sí | Tipo de cuenta: `checking_account` o `sight_account` |
| `--comment` | No | Comentario base para las transferencias (default: "Pago") |
| `--skip-polling` | No | Omitir verificación de estados finales |

### Bancos disponibles (Chile)

| Banco | ID |
|-------|-----|
| Banco Estado | `cl_banco_estado` |
| Banco BCI | `cl_banco_bci` |
| Banco de Chile | `cl_banco_de_chile` |
| Banco Santander | `cl_banco_santander` |
| Banco Itaú | `cl_banco_itau` |
| Scotiabank | `cl_banco_scotiabank` |
| Banco Falabella | `cl_banco_falabella` |
| Banco Security | `cl_banco_security` |
| BBVA | `cl_banco_bbva` |
| Mercado Pago | `cl_mercado_pago` |
| Mach | `cl_mach` |
| Tenpo | `cl_tenpo` |

Ver lista completa en la [documentación de Fintoc](https://docs.fintoc.com/reference/chile-institution-codes).

## Ejemplo de ejecución

```bash
npm run transfer -- \
  --amount 500000000 \
  --rut "20163891-7" \
  --name "Empresa Demo SpA" \
  --account "000012345678" \
  --bank "cl_banco_santander" \
  --type "checking_account" \
  --comment "Pago factura"
```

### Salida esperada

```
Fintoc High-Value Transfer Script
────────────────────────────────────────────────────────────
ℹ Starting transfer process...
✓ Environment configuration validated
✓ Input parameters validated

Transfer Details
────────────────────────────────────────────────────────────
ℹ Amount: $500.000.000 CLP
ℹ Recipient: Empresa Demo SpA
ℹ RUT: 20163891-7
ℹ Running in TEST MODE

Balance Verification
────────────────────────────────────────────────────────────
ℹ Account: SantiagoOlivos
ℹ Available Balance: $500.000.000 CLP
ℹ Amount to Transfer: $500.000.000 CLP
✓ Sufficient balance available.

Transfer Execution Plan
────────────────────────────────────────────────────────────
ℹ Total amount: $500.000.000 CLP
ℹ Number of transfers: 72
ℹ Max per transfer: $7.000.000 CLP
────────────────────────────────────────────────────────────
[████████████████████] 100% Executing transfer 72/72...

Process Complete
────────────────────────────────────────────────────────────
✓ Report saved to:
ℹ   JSON: outputs/transfers_2026-02-10_01-53-22.json
```

## Reportes generados

Los reportes se guardan en la carpeta `outputs/` en formato JSON:

```json
{
  "metadata": {
    "generatedAt": "2026-02-10T01:53:22.509Z",
    "totalAmount": 500000000,
    "currency": "CLP",
    "recipient": {
      "holder_id": "20163891-7",
      "holder_name": "Juan Pérez",
      "account_number": "12456789",
      "account_type": "checking_account",
      "institution_id": "cl_banco_santander"
    },
    "mode": "test"
  },
  "summary": {
    "total": 72,
    "successful": 72,
    "pending": 0,
    "failed": 0,
    "totalAmountAttempted": 500000000,
    "totalAmountSucceeded": 500000000
  },
  "transfers": [
    {
      "index": 1,
      "transferId": "tr_abc123",
      "amount": 7000000,
      "status": "pending",
      "finalStatus": "succeeded",
      "comment": "Pago 1/72 ref:a1b2c3d4"
    }
  ]
}
```

## Estructura del proyecto

```
parte-1/
├── src/
│   ├── index.js           # Entry point con CLI
│   ├── fintoc-client.js   # Cliente API de Fintoc
│   ├── transfer-service.js # Lógica de transferencias
│   ├── report-generator.js # Generador de reportes
│   └── utils/
│       └── logger.js      # Utilidad de logging
├── outputs/               # Reportes generados
├── .env.example
├── .gitignore
├── package.json
├── README.md
└── TECHNICAL.md           # Documentación técnica
```

## Manejo de errores

El script implementa "fail-fast": si ocurre un error crítico (saldo insuficiente, RUT inválido, cuenta no encontrada), se detiene inmediatamente y genera un reporte de error.

### Errores críticos que detienen la ejecución:
- `insufficient_balance` - Saldo insuficiente
- `invalid_holder_id` - RUT inválido
- `invalid_account` - Cuenta no válida
- `account_not_found` - Cuenta no encontrada
- `unauthorized` - API key inválida

Los reportes de error se guardan en `outputs/error_*.json` con recomendaciones de solución.

## Notas importantes

1. **Modo Test**: Este script está diseñado para usarse con credenciales de test (`sk_test_...`). Las transferencias en modo test no mueven dinero real.

2. **Simulación de saldo**: En modo test, el script puede simular depósitos automáticamente cuando no hay fondos suficientes.

3. **Límite de transferencia**: El límite de $7.000.000 CLP es el máximo en Chile. El script divide automáticamente montos mayores.

4. **Idempotency Keys**: Cada transferencia tiene un ID único para evitar duplicados en caso de reintentos.

5. **Seguridad**: Nunca compartas tu `private_key.pem` ni tu API key. Están incluidos en `.gitignore`.

## Documentación de referencia

- [Fintoc API Docs](https://docs.fintoc.com)
- [Transfers Quickstart](https://docs.fintoc.com/docs/transfers-quickstart)
- [Test Your Integration](https://docs.fintoc.com/docs/test-your-integration)
- [JWS Key Setup](https://docs.fintoc.com/docs/setting-up-jws-keys)
- [Chile Institution Codes](https://docs.fintoc.com/reference/chile-institution-codes)
