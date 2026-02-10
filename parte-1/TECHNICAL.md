# Documentación Técnica

Este documento describe la arquitectura, clases, métodos y flujo de datos del script de transferencias de alto monto.

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                         index.js                                │
│                    (CLI Entry Point)                            │
│  - Parsea argumentos CLI                                        │
│  - Valida configuración y inputs                                │
│  - Orquesta el flujo principal                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│FintocClient │ │TransferSvc  │ │ReportGen    │
│             │ │             │ │             │
│- API calls  │ │- Chunks     │ │- JSON       │
│- Simulate   │ │- Execute    │ │- Error rpt  │
│- Balance    │ │- Fail-fast  │ │             │
└─────────────┘ └─────────────┘ └─────────────┘
         │             │             │
         └─────────────┴─────────────┘
                       │
                       ▼
              ┌─────────────┐
              │   logger    │
              │  (utils)    │
              └─────────────┘
```

## Flujo de Ejecución

```
1. CLI Parse (commander)
        │
        ▼
2. Validate Config (.env)
        │
        ▼
3. Validate Inputs (RUT, bank, etc.)
        │
        ▼
4. Initialize FintocClient
        │
        ▼
5. Check Balance ◄────────────────────┐
        │                              │
        ▼                              │
6. Insufficient? ──yes──► Ask Simulate?
        │                      │
        no                    yes
        │                      │
        ▼                      ▼
7. Execute Transfers    Simulate Deposit
        │                      │
        ▼                      │
8. Poll Statuses ◄─────────────┘
        │
        ▼
9. Generate Report
        │
        ▼
10. Exit
```

---

## Módulos

### 1. `index.js` - Entry Point

**Responsabilidad**: Punto de entrada CLI, orquestación del flujo principal.

#### Funciones

| Función | Descripción |
|---------|-------------|
| `validateConfig()` | Valida variables de entorno requeridas |
| `validateInputs()` | Valida parámetros CLI (monto, RUT, banco, etc.) |
| `askQuestion(question)` | Prompt interactivo para preguntar al usuario |
| `main()` | Función principal que orquesta todo el flujo |

#### Flujo en `main()`

```javascript
1. logger.header() // Mostrar título
2. validateConfig() // Validar .env
3. validateInputs() // Validar CLI args
4. new FintocClient(config) // Crear cliente
5. fintocClient.initialize() // Inicializar SDK
6. fintocClient.getAccountBalance() // Verificar saldo
7. if (insufficientBalance && testMode) {
     askQuestion() // Preguntar si simular
     fintocClient.simulateDeposit() // Simular depósito
   }
8. transferService.executeTransfers() // Ejecutar transferencias
9. transferService.pollTransferStatuses() // Verificar estados
10. transferService.summarizeResults() // Generar resumen
11. reportGenerator.generateReport() // Guardar JSON
```

---

### 2. `fintoc-client.js` - Cliente API

**Responsabilidad**: Encapsular todas las llamadas a la API de Fintoc.

#### Propiedades

| Propiedad | Tipo | Descripción |
|-----------|------|-------------|
| `apiKey` | string | API Key de Fintoc (`sk_test_...` o `sk_live_...`) |
| `jwsPrivateKeyPath` | string | Ruta al archivo `private_key.pem` |
| `accountId` | string | ID de la cuenta origen (`acc_...`) |
| `client` | Fintoc | Instancia del SDK de Fintoc |

#### Métodos

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `initialize()` | - | `boolean` | Inicializa el SDK de Fintoc |
| `createTransfer(data)` | `{amount, counterparty, comment, idempotencyKey}` | `{success, transfer?, error?}` | Crea una transferencia |
| `getTransfer(id)` | `string` | `Transfer` | Obtiene detalles de una transferencia |
| `listTransfers(options)` | `object` | `Transfer[]` | Lista transferencias de la cuenta |
| `getAccounts()` | - | `Account[]` | Lista todas las cuentas |
| `getAccountBalance()` | - | `{success, balance, ...}` | Obtiene el saldo de la cuenta |
| `getAccountDetails()` | - | `{success, accountNumberId, balance, ...}` | Obtiene detalles completos |
| `getAccountNumbers()` | - | `{success, accountNumbers}` | Obtiene IDs de números de cuenta |
| `simulateDeposit(amount)` | `number` | `{success, status, amountDeposited, newBalance}` | Simula un depósito (solo test) |
| `isTestMode()` | - | `boolean` | Verifica si está en modo test |

#### Ejemplo de uso

```javascript
const client = new FintocClient({
  apiKey: 'sk_test_xxx',
  jwsPrivateKeyPath: './private_key.pem',
  accountId: 'acc_xxx'
});

await client.initialize();

// Verificar saldo
const balance = await client.getAccountBalance();
// { success: true, balance: { available: 500000000 }, ... }

// Simular depósito (solo modo test)
if (client.isTestMode()) {
  const deposit = await client.simulateDeposit(500000000);
  // { success: true, status: 'succeeded', amountDeposited: 500000000, newBalance: {...} }
}

// Crear transferencia
const result = await client.createTransfer({
  amount: 7000000,
  counterparty: { holderId: '12345678-5', ... },
  comment: 'Pago 1/72',
  idempotencyKey: 'uuid-xxx'
});
```

---

### 3. `transfer-service.js` - Servicio de Transferencias

**Responsabilidad**: Lógica de negocio para dividir y ejecutar transferencias.

#### Constantes

| Constante | Valor | Descripción |
|-----------|-------|-------------|
| `MAX_TRANSFER_AMOUNT` | 7,000,000 | Monto máximo por transferencia (CLP) |
| `POLL_INTERVAL_MS` | 2,000 | Intervalo de polling (ms) |
| `MAX_POLL_ATTEMPTS` | 30 | Máximo intentos de polling |
| `CRITICAL_ERRORS` | Array | Errores que detienen la ejecución |

#### Métodos

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `calculateTransferChunks(amount)` | `number` | `{index, amount}[]` | Divide el monto en chunks de máx $7M |
| `generateUniqueComment(base, i, total)` | `string, number, number` | `string` | Genera comentario único con UUID |
| `verifyBalance(amount)` | `number` | `{success, error?, balance?}` | Verifica si hay saldo suficiente |
| `isCriticalError(msg)` | `string` | `boolean` | Detecta errores que deben parar todo |
| `executeTransfers(amount, counterparty, comment, skipCheck)` | `...` | `{success, aborted, results}` | Ejecuta todas las transferencias |
| `pollTransferStatuses(results)` | `Result[]` | `Result[]` | Consulta estados finales |
| `isPendingStatus(status)` | `string` | `boolean` | Verifica si status es pending |
| `summarizeResults(results)` | `Result[]` | `Summary` | Genera resumen de resultados |

#### Algoritmo de `calculateTransferChunks`

```javascript
calculateTransferChunks(500000000)
// Resultado:
// [
//   { index: 1, amount: 7000000 },
//   { index: 2, amount: 7000000 },
//   ...
//   { index: 71, amount: 7000000 },
//   { index: 72, amount: 3000000 }  // El resto
// ]
// Total: 71 × 7M + 3M = 500M
```

#### Fail-Fast Logic

```javascript
const CRITICAL_ERRORS = [
  'insufficient_balance',
  'invalid_holder_id',
  'invalid_account',
  'account_not_found',
  'unauthorized',
  'forbidden'
];

// En executeTransfers():
if (this.isCriticalError(result.error)) {
  aborted = true;
  abortReason = result.error;
  break; // Detiene el loop inmediatamente
}
```

---

### 4. `report-generator.js` - Generador de Reportes

**Responsabilidad**: Generar reportes JSON de resultados y errores.

#### Métodos

| Método | Parámetros | Retorno | Descripción |
|--------|------------|---------|-------------|
| `generateFilename(prefix)` | `string` | `string` | Genera nombre con timestamp |
| `generateJSON(results, summary, metadata)` | `...` | `string` (path) | Genera reporte JSON de éxito |
| `generateReport(results, summary, metadata)` | `...` | `{jsonPath}` | Wrapper para generar reportes |
| `generateErrorReport(errorData, metadata)` | `...` | `{jsonPath, textPath}` | Genera reporte de error |
| `formatErrorReportText(report)` | `object` | `string` | Formatea error como texto legible |
| `getErrorRecommendations(errorType)` | `string` | `string[]` | Obtiene recomendaciones por tipo de error |

#### Estructura del Reporte JSON

```json
{
  "metadata": {
    "generatedAt": "ISO timestamp",
    "totalAmount": 500000000,
    "currency": "CLP",
    "recipient": {
      "holder_id": "RUT",
      "holder_name": "Nombre",
      "account_number": "Cuenta",
      "account_type": "checking_account",
      "institution_id": "cl_banco_xxx"
    },
    "mode": "test|live"
  },
  "summary": {
    "total": 72,
    "successful": 72,
    "pending": 0,
    "failed": 0,
    "totalAmountAttempted": 500000000,
    "totalAmountSucceeded": 500000000
  },
  "transfers": [...]
}
```

#### Estructura del Reporte de Error

```json
{
  "metadata": {
    "generatedAt": "...",
    "reportType": "ERROR",
    ...
  },
  "error": {
    "type": "insufficient_balance",
    "message": "Account has insufficient balance",
    "details": {
      "available": 0,
      "required": 500000000,
      "deficit": 500000000
    }
  },
  "execution": {
    "aborted": true,
    "totalPlanned": 72,
    "totalExecuted": 1
  },
  "partialResults": [...],
  "recommendations": [
    "Check the account balance...",
    "Add funds to the account..."
  ]
}
```

---

### 5. `utils/logger.js` - Utilidad de Logging

**Responsabilidad**: Formatear y mostrar mensajes en consola con estilo.

#### Métodos

| Método | Parámetros | Descripción |
|--------|------------|-------------|
| `header(text)` | `string` | Muestra título con líneas decorativas |
| `divider()` | - | Muestra línea separadora |
| `info(text)` | `string` | Mensaje informativo (ℹ) |
| `success(text)` | `string` | Mensaje de éxito (✓) verde |
| `warning(text)` | `string` | Mensaje de advertencia (⚠) amarillo |
| `error(text)` | `string` | Mensaje de error (✗) rojo |
| `progress(current, total, text)` | `number, number, string` | Barra de progreso |

---

## Relaciones entre Módulos

```
index.js
    │
    ├── FintocClient
    │       │
    │       ├── Fintoc SDK (npm: fintoc)
    │       │       └── API calls to api.fintoc.com
    │       │
    │       └── fetch() for simulate endpoint
    │
    ├── TransferService
    │       │
    │       └── FintocClient (dependency injection)
    │               └── createTransfer()
    │               └── getTransfer()
    │
    ├── ReportGenerator
    │       │
    │       └── fs.writeFileSync()
    │
    └── logger (shared utility)
```

## Manejo de Errores

### Niveles de Error

1. **Críticos (Fail-Fast)**: Detienen toda la ejecución
   - `insufficient_balance`
   - `invalid_holder_id`
   - `unauthorized`

2. **De Transferencia Individual**: Se registran pero continúan
   - `timeout`
   - `rate_limit`

3. **Fatales**: Terminan el proceso con código de error
   - Errores de configuración
   - Errores de conexión

### Flujo de Manejo

```
Error detectado
      │
      ▼
¿Es crítico? ──yes──► Abort + Error Report
      │
      no
      │
      ▼
Registrar en results
      │
      ▼
Continuar ejecución
```

## API de Fintoc Utilizada

| Endpoint | Método | Uso |
|----------|--------|-----|
| `/v2/accounts` | GET | Listar cuentas |
| `/v2/accounts/:id` | GET | Obtener balance |
| `/v2/account_numbers` | GET | Obtener IDs para simulación |
| `/v2/transfers` | POST | Crear transferencia |
| `/v2/transfers/:id` | GET | Consultar estado |
| `/v2/simulate/receive_transfer` | POST | Simular depósito (test) |

## Consideraciones de Seguridad

1. **API Key**: Nunca se loguea, está en `.env`
2. **Private Key**: Archivo `.pem` en `.gitignore`
3. **Idempotency**: UUID único por transferencia
4. **Fail-Fast**: Evita pérdida de fondos en errores
