# P2 서비스 실행 매뉴얼

**P2 = Knowledge Retrieval & Serving Platform**  
Why: 기업 지식을 AI가 검색·serving할 수 있는 기반.  
포트폴리오 스토리: [`PORTFOLIO_NARRATIVE.md`](PORTFOLIO_NARRATIVE.md).

터미널에서 Project 2 HTTP 서비스를 띄우고 동작을 확인하는 방법입니다.  
(Express 없음 · 기본은 InMemory + Fake LLM · 데모 시드 포함)

---

## 0. 사전 준비

```bash
cd /home/user/workspace/vibe/ai-knowledge-platform
pnpm install
pnpm typecheck   # 선택
```

이미 `8080`을 쓰는 프로세스가 있으면 끄거나 `PORT`를 바꿉니다.

```bash
# 포트 점유 확인 (선택)
curl -sS -m 1 http://127.0.0.1:8080/health || echo "8080 free"
```

---

## 1. 가장 빠른 실행 (권장)

### 1-1. 서버 기동

```bash
pnpm start
```

성공 시 로그 예:

```text
STORE: inmemory
VECTOR: inmemory
LLM: fake
Demo knowledge seeded for workspace workspace-a
Listening operations host bound at http://127.0.0.1:8080
```

종료: 해당 터미널에서 `Ctrl+C`

### 1-2. 다른 터미널에서 동작 확인

```bash
# Health (인증 불필요)
curl -sS http://127.0.0.1:8080/health
# → {"status":"ok"}

# Metrics (인증 불필요)
curl -sS http://127.0.0.1:8080/metrics | head

# Cited answers (Bearer 필수) — 데모 쿼리는 aaaaaaaa
curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/cited-answers \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{"query":"aaaaaaaa"}'

# 무인증 → 401 이어야 정상
curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
  http://127.0.0.1:8080/workspaces/workspace-a/cited-answers \
  -H 'content-type: application/json' \
  -d '{"query":"aaaaaaaa"}'

# MCP tools/list
curl -sS -X POST http://127.0.0.1:8080/mcp \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## 2. 환경 변수

| 변수 | 기본값 | 설명 |
|---|---|---|
| `HOST` | `127.0.0.1` | bind 주소 (Docker는 `0.0.0.0`) |
| `PORT` | `8080` | 포트 |
| `API_KEY` | `demo-key` | Bearer 토큰 |
| `API_KEY_SUBJECT` | `demo-user` | 주체 |
| `WORKSPACE_ID` | `workspace-a` | 워크스페이스 |
| `SKIP_DEMO_SEED` | (없음) | `1`이면 시드 생략 |
| `DATABASE_URL` | (없음) | 있으면 Postgres SoT |
| `OPENSEARCH_URL` | (없음) | 있으면 OpenSearch 벡터 |
| `OPENSEARCH_INDEX` | `knowledge-embeddings` | 인덱스 이름 |
| `LLM_API_KEY` | (없음) | 있으면 HTTP LLM, 없으면 Fake |

예:

```bash
HOST=127.0.0.1 PORT=8080 API_KEY=demo-key WORKSPACE_ID=workspace-a pnpm start
```

샘플: `.env.example` (필요 시 복사해 쓰되, 실제 키는 커밋하지 말 것)

```bash
cp .env.example .env
# .env를 자동으로 읽지 않을 수 있음 → export 하거나 한 줄로 env 붙여 실행
set -a && source .env && set +a && pnpm start
```

### STORE / VECTOR 조합

| 환경 | STORE | VECTOR |
|---|---|---|
| (없음) | inmemory | inmemory |
| `DATABASE_URL`만 | postgres | sql |
| `OPENSEARCH_URL`만 | opensearch | opensearch |
| 둘 다 | postgres+opensearch | opensearch |

---

## 3. API 요약

| Method | Path | Auth |
|---|---|---|
| GET | `/health` | 없음 |
| GET | `/metrics` | 없음 |
| POST | `/workspaces/:workspaceId/cited-answers` | `Authorization: Bearer <API_KEY>` |
| POST | `/mcp` | Bearer (JSON-RPC) |

- `:workspaceId`는 키에 묶인 `WORKSPACE_ID`와 같아야 함 (다르면 403)
- 데모 시드 문서의 검색 토큰: **`aaaaaaaa`**

---

## 4. Docker로 실행 (선택)

### App만 (InMemory)

```bash
docker compose -f docker/docker-compose.yml up app --build
# http://127.0.0.1:8080/health
# Authorization: Bearer demo-key
```

### Infra만 (Postgres / OpenSearch)

```bash
docker compose -f docker/docker-compose.yml up -d postgres opensearch
```

그다음 로컬 `pnpm start`에 연결:

```bash
DATABASE_URL=postgres://knowledge:knowledge@127.0.0.1:5432/knowledge \
  pnpm start

OPENSEARCH_URL=http://127.0.0.1:9200 \
  OPENSEARCH_INDEX=knowledge-embeddings \
  pnpm start

DATABASE_URL=postgres://knowledge:knowledge@127.0.0.1:5432/knowledge \
  OPENSEARCH_URL=http://127.0.0.1:9200 \
  pnpm start
```

### Full (app + Postgres + OpenSearch)

```bash
docker compose -f docker/docker-compose.yml --profile full \
  up app-full postgres opensearch --build
```

`app`과 `app-full`을 동시에 띄우지 마세요 (둘 다 8080).

---

## 5. 자동 스모크 (서버를 직접 안 띄워도 됨)

```bash
pnpm validate:server:start-smoke
pnpm validate:server:start-postgres-smoke
pnpm validate:server:start-opensearch-smoke
pnpm validate:server:start-postgres-opensearch-smoke
```

Live (환경 없으면 skip, exit 0):

```bash
# LLM_API_KEY=... pnpm validate:server:start-llm-live
# DATABASE_URL=... pnpm validate:server:start-postgres-live
# OPENSEARCH_URL=... pnpm validate:server:start-opensearch-live
```

---

## 6. 문제 해결

| 증상 | 확인 |
|---|---|
| `EADDRINUSE` | 다른 프로세스가 8080 사용 → 종료 또는 `PORT=8081 pnpm start` |
| cited-answers 401 | `Authorization: Bearer demo-key` 헤더 확인 |
| cited-answers 403 | URL의 workspace가 `workspace-a`(또는 설정한 `WORKSPACE_ID`)인지 확인 |
| 빈 답 / evidence 없음 | 데모 시드 켰는지 (`SKIP_DEMO_SEED` 끄기), query를 `aaaaaaaa`로 |
| Postgres 연결 실패 | compose postgres up 여부, `DATABASE_URL` 사용자/비번 |
| OpenSearch 실패 | compose opensearch up, `OPENSEARCH_URL=http://127.0.0.1:9200` |

---

## 7. 한 장 요약

```bash
cd /home/user/workspace/vibe/ai-knowledge-platform
pnpm install
pnpm start
# 다른 터미널:
curl -sS http://127.0.0.1:8080/health
curl -sS -X POST http://127.0.0.1:8080/workspaces/workspace-a/cited-answers \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer demo-key' \
  -d '{"query":"aaaaaaaa"}'
```
