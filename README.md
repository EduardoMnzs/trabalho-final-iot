# Estacionamento Inteligente — Campus (MQTT + HTTP + Postgres)

MVP de estacionamento inteligente com 3 setores (A, B, C) de 30 vagas cada (90 no total).
Atende ao trabalho final de Sistemas Embarcados e IoT — Unimar.

## Arquitetura

5 containers orquestrados via `docker-compose`:

| Serviço      | Função                                              | Porta |
|--------------|-----------------------------------------------------|-------|
| `mosquitto`  | Broker MQTT                                         | 1883  |
| `postgres`   | Banco (history + estado atual)                      | 5432  |
| `simulator`  | 90 sensores + 3 gateways publicando eventos MQTT    | 9000 (HTTP de injeção de falhas) |
| `ingestor`   | Assina MQTT, persiste, detecta incidentes, recomenda| —     |
| `api`        | REST `/api/v1/*` + dashboard estático `/dashboard`  | 3000  |

Backend em **Node.js + Express + Sequelize + Postgres**, arquitetura **MVC**, quatro workspaces npm (`shared/`, `api/`, `ingestor/`, `simulator/`) compartilhando os models Sequelize.

## Pré-requisitos

- Docker Desktop 24+ (com Docker Compose v2)
- Portas livres no host: **1883** (MQTT), **3000** (API), **5432** (Postgres), **9000** (injetor)

## Como rodar

```bash
# (opcional) copie o .env
cp .env.example .env

# sobe tudo
docker compose up --build
```

Aguarde alguns segundos até o ingestor terminar as migrations. Em seguida:

- Dashboard: <http://localhost:3000/> (ou <http://localhost:3000/dashboard/>)
- API:       <http://localhost:3000/api/v1/map>
- Injetor:   `curl http://localhost:9000/state`
- Subscriber MQTT: `docker compose exec mosquitto mosquitto_sub -v -t 'campus/parking/#'`

> Acesse o dashboard pelo Express (porta 3000). **Não abra `index.html` pelo Live Server do VS Code** — ele não serve a API e dará 404.

## Roteiro de demo (checklist do enunciado)

1. **Subir tudo** — `docker compose up`.
2. **/map e /sectors em tempo real**:
   ```bash
   curl -s localhost:3000/api/v1/map     | jq '.sectors[] | {sectorId, occupancyRate}'
   curl -s localhost:3000/api/v1/sectors | jq
   ```
   ou abra o dashboard.
3. **Injetar FLAPPING em uma vaga**:
   ```bash
   curl -X POST localhost:9000/inject -H "Content-Type: application/json" \
        -d '{"spotId":"A-13","mode":"flapping"}'
   # ~90s reais depois (com TIME_SCALE=60), o incidente aparece:
   curl -s localhost:3000/api/v1/incidents?status=open | jq
   ```
4. **Injetar STUCK_OCCUPIED**:
   ```bash
   curl -X POST localhost:9000/inject -H "Content-Type: application/json" \
        -d '{"spotId":"B-02","mode":"stuck_occupied"}'
   # incidente STUCK_OCCUPIED após STUCK_OCCUPIED_THRESHOLD_SEC simulados
   ```
5. **Lotar um setor → recomendação ≥ 90%**:
   ```bash
   curl -X POST localhost:9000/inject -H "Content-Type: application/json" \
        -d '{"sectorId":"A","mode":"fill"}'
   # quando A atinge >= 90% (segundos no dashboard), pergunte:
   curl -s "localhost:3000/api/v1/recommendation?fromSector=A" | jq
   # também publicada em MQTT:
   docker compose exec mosquitto mosquitto_sub -t 'campus/parking/recommendations'
   ```
6. **Auditoria no banco**:
   ```bash
   docker compose exec postgres psql -U parking -d parking -c \
     "SELECT type, status, COUNT(*) FROM incidents GROUP BY 1,2;"
   docker compose exec postgres psql -U parking -d parking -c \
     "SELECT ts, from_sector, recommended_sector, reason FROM recommendations_log ORDER BY ts DESC LIMIT 5;"
   ```
7. **Relatório de turnover** (sem `from`/`to` usa a última janela de 24h simuladas com base em `MAX(ts)` da tabela de eventos):
   ```bash
   curl -s "localhost:3000/api/v1/reports/turnover?sectorId=A" | jq
   # ou com janela explícita:
   curl -s "localhost:3000/api/v1/reports/turnover?sectorId=A&from=2026-05-11T00:00:00Z&to=2026-05-13T00:00:00Z" | jq
   ```

## Tópicos MQTT

| Tópico | Direção | Payload |
|--------|---------|---------|
| `campus/parking/sectors/{A\|B\|C}/spots/{spotId}/events` | sim → broker → ingestor | `{eventId, ts, sectorId, spotId, state, source}` |
| `campus/parking/sectors/{A\|B\|C}/gateway/status` | sim → broker (retained) | `{ts, sectorId, status}` |
| `campus/parking/recommendations` | ingestor/api → broker (retained) | resposta da recomendação |

## Endpoints HTTP

| Método | Path | Descrição |
|--------|------|-----------|
| GET | `/api/v1/map` | mapa completo com estado de cada vaga |
| GET | `/api/v1/sectors` | agregados por setor |
| GET | `/api/v1/sectors/:sectorId/spots` | vagas do setor |
| GET | `/api/v1/sectors/:sectorId/free-spots?limit=N` | só as livres |
| GET | `/api/v1/reports/turnover?sectorId=&from=&to=` | transições FREE→OCCUPIED |
| GET | `/api/v1/incidents?status=open\|closed\|all&sectorId=` | incidentes |
| GET | `/api/v1/recommendation?fromSector=` | recomenda outro setor se ≥ 90% |
| POST | `/api/v1/admin/reset` | limpa o banco e zera o simulador (demo) |

## Tabelas (Postgres)

- `spots`              — estado atual de cada vaga
- `spot_events`        — log de eventos brutos (idempotente por `event_id`)
- `sector_snapshots`   — agregados por minuto simulado
- `incidents`          — STUCK_OCCUPIED / STUCK_FREE / FLAPPING
- `recommendations_log`— auditoria de recomendações

## Variáveis de ambiente (`.env`)

Veja `.env.example`. Principais:

- `TIME_SCALE` (default 60) — fator de aceleração do tempo simulado.
- `FLAPPING_WINDOW_SEC` / `FLAPPING_MAX_TRANSITIONS` — sensibilidade do detector de flapping.
- `STUCK_OCCUPIED_THRESHOLD_SEC` / `STUCK_FREE_THRESHOLD_SEC` — tempo simulado sem transição.
- `RECOMMENDATION_THRESHOLD` (default 0.90) — taxa para acionar recomendação.
- `RESET_INTERVAL_MS` (default 0) — se > 0, o ingestor zera todos os dados a cada N ms.

## Modo demo rápido / reset periódico

Para apresentações curtas onde você quer ver picos, lotação e incidentes acontecerem em segundos:

```bash
# .env
TIME_SCALE=600            # 1s real = 10min simulados → dia inteiro em 2,4 min reais
STUCK_SCAN_INTERVAL_MS=15000
RECOMMENDATION_COOLDOWN_SEC=60
RESET_INTERVAL_MS=300000  # limpa tudo a cada 5 minutos reais
```

Com isso o ingestor, a cada 5 min:

1. `TRUNCATE` em `spot_events`, `sector_snapshots`, `incidents`, `recommendations_log`, `spots`
2. Re-cria as 90 vagas no estado `FREE`
3. Chama `POST /reset` no simulador (zera estado em memória + fault modes)

Também é possível **forçar reset on-demand**:

```bash
curl -X POST http://localhost:3000/api/v1/admin/reset
# → { "ok": true, "dbReset": true, "simulatorReset": true }
```

Mude `TIME_SCALE` no `.env` e reinicie com `docker compose up -d --force-recreate` (ou `docker compose down && docker compose up -d`).

## Injeção de falhas (HTTP `:9000`)

```bash
POST /inject { "spotId":"A-13", "mode":"flapping" }
POST /inject { "spotId":"B-02", "mode":"stuck_occupied" }
POST /inject { "spotId":"C-30", "mode":"stuck_free" }
POST /inject { "spotId":"A-13", "mode":"normal" }
POST /inject { "sectorId":"A",  "mode":"fill" }
GET  /state                    # debug: estado atual de todas as vagas no simulador
```

## Estrutura do projeto

```
trabalho-final/
├── docker-compose.yml           # orquestração dos 5 containers
├── .env.example                 # template de variáveis de ambiente
├── mosquitto/
│   └── mosquitto.conf           # config do broker MQTT
├── shared/                      # pacote npm compartilhado
│   ├── db.js                    # Sequelize factory
│   ├── models/                  # Spot, SpotEvent, SectorSnapshot, Incident, RecommendationLog
│   ├── time.js                  # helper de tempo simulado (TIME_SCALE)
│   ├── migrate.js               # sync + seed das 90 vagas
│   └── constants.js             # SECTORS, allSpotIds(), ...
├── simulator/                   # publica eventos MQTT realistas
│   └── src/
│       ├── spot.js              # state machine FREE↔OCCUPIED por vaga
│       ├── gateway.js           # publica por setor (3 gateways)
│       ├── arrivals.js          # curva diária de chegadas (picos manhã/tarde)
│       ├── faultInjector.js     # HTTP :9000 para injetar falhas
│       └── index.js
├── ingestor/                    # assina MQTT, persiste, detecta, recomenda
│   └── src/
│       ├── mqtt/handlers.js     # validação + idempotência por eventId
│       ├── services/
│       │   ├── ingestion.js     # persiste evento + atualiza estado
│       │   ├── flapping.js      # detector event-driven
│       │   ├── stuckScanner.js  # detector periódico (setInterval)
│       │   ├── snapshotJob.js   # snapshot por minuto simulado
│       │   └── recommender.js   # ≥90% → publica recomendação
│       └── index.js
└── api/                         # Express MVC + dashboard estático
    └── src/
        ├── server.js
        ├── app.js
        ├── routes/              # map, sectors, reports, incidents, recommendation
        ├── controllers/
        ├── services/            # sectorService, recommenderProxy
        ├── views/               # DTOs JSON
        └── public/              # dashboard HTML+CSS+JS
```

## Decisões de design (resumo)

- **Idempotência por `eventId`**: PK da tabela `spot_events`; `INSERT … ON CONFLICT DO NOTHING` evita duplicar mesmo com re-entrega do broker (QoS 1).
- **Out-of-order**: o `UPDATE spots` só aplica se `lastChangeTs < $ts`. Evento antigo que chega depois não corrompe o estado atual.
- **Detector híbrido**: FLAPPING é event-driven (sintoma = excesso de eventos); STUCK roda por scanner periódico (sintoma = ausência de eventos).
- **Tempo simulado** controlado por `TIME_SCALE` (default 60×) — permite acelerar a curva diária para a demo.
- **Recomendação com cooldown** em tempo real (5 min) para não floodar dashboards quando o setor está oscilando perto de 90%.
- **Dashboard servido pelo próprio Express** (não precisa de Live Server).

## Licença

Trabalho acadêmico — Sistemas Embarcados e IoT — Unimar.
