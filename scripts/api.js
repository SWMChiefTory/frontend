#!/usr/bin/env node
/**
 * Cheftory API CLI
 *
 * 로컬에 refresh token을 저장해두고, 만료되면 access token을 자동 재발급한 뒤
 * 임의의 API endpoint를 호출한다.
 *
 * 사용법:
 *   node scripts/api.js GET /recipes
 *   node scripts/api.js POST /recipes '{"video_url":"..."}'
 *   node scripts/api.js DELETE /recipes/abc123
 *
 *   node scripts/api.js login         # refresh token 직접 입력
 *   node scripts/api.js whoami        # 저장된 토큰 상태 확인
 *   node scripts/api.js logout        # 저장된 토큰 삭제
 *
 * 토큰 저장 위치: ~/.cheftory-cli/tokens.json (chmod 600)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const API_URL =
  process.env.CHEFTORY_API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://api.cheftories.com/api/v1';

const TOKENS_DIR = path.join(os.homedir(), '.cheftory-cli');
const TOKENS_FILE = path.join(TOKENS_DIR, 'tokens.json');

// ─── token storage ─────────────────────────────────────

function loadTokens() {
  try {
    if (!fs.existsSync(TOKENS_FILE)) return null;
    return JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveTokens(accessToken, refreshToken) {
  if (!fs.existsSync(TOKENS_DIR)) {
    fs.mkdirSync(TOKENS_DIR, { recursive: true, mode: 0o700 });
  }
  fs.writeFileSync(
    TOKENS_FILE,
    JSON.stringify(
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        saved_at: new Date().toISOString(),
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
}

function clearTokens() {
  if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
}

// ─── prompt ────────────────────────────────────────────

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

// ─── api ───────────────────────────────────────────────

async function reissue(refreshToken) {
  const res = await fetch(`${API_URL}/auth/token/reissue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`reissue failed: ${res.status} ${text}`);
  }
  return res.json();
}

// JWT exp 디코드 — 만료 60초 전이면 만료로 간주
function isJwtExpired(token) {
  try {
    const raw = token.startsWith('Bearer ') ? token.slice(7) : token;
    const payload = raw.split('.')[1];
    if (!payload) return true;
    const json = JSON.parse(Buffer.from(payload, 'base64').toString());
    if (!json.exp) return true;
    return json.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

async function refreshFlow() {
  let tokens = loadTokens();

  if (!tokens?.refresh_token) {
    console.error('저장된 refresh token이 없어요.');
    const rt = await prompt('refresh token을 붙여넣어주세요: ');
    if (!rt) throw new Error('refresh token이 비어있어요. 종료.');
    const data = await reissue(rt);
    saveTokens(data.access_token, data.refresh_token);
    return data.access_token;
  }

  try {
    const data = await reissue(tokens.refresh_token);
    saveTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch (err) {
    console.error('refresh 실패 (앱이 같은 토큰으로 먼저 refresh했을 수 있어요):', err.message);
    const rt = await prompt('새 refresh token을 붙여넣어주세요: ');
    if (!rt) throw new Error('refresh token이 비어있어요. 종료.');
    const data = await reissue(rt);
    saveTokens(data.access_token, data.refresh_token);
    return data.access_token;
  }
}

async function fetchWithAuth(url, init, accessToken) {
  const bearer = accessToken.startsWith('Bearer ') ? accessToken : `Bearer ${accessToken}`;
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: bearer },
  });
}

async function callApi(method, urlPath, body) {
  const url = urlPath.startsWith('http') ? urlPath : `${API_URL}${urlPath.startsWith('/') ? urlPath : '/' + urlPath}`;

  const init = {
    method: method.toUpperCase(),
    headers: { Accept: 'application/json' },
  };
  if (body !== undefined && body !== null && body !== '') {
    init.headers['Content-Type'] = 'application/json';
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // 1. 저장된 access token이 살아있으면 그대로 사용 (rotation 최소화)
  let tokens = loadTokens();
  let accessToken = tokens?.access_token;

  if (!accessToken || isJwtExpired(accessToken)) {
    accessToken = await refreshFlow();
  }

  let res = await fetchWithAuth(url, init, accessToken);

  // 2. 401이면 refresh 한 번 재시도
  if (res.status === 401) {
    console.log('[auth] 401 → refresh 재시도');
    accessToken = await refreshFlow();
    res = await fetchWithAuth(url, init, accessToken);
  }

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  console.log(`\n[${res.status} ${res.statusText}] ${init.method} ${url}`);
  console.log(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));

  if (!res.ok) process.exitCode = 1;
}

// ─── commands ──────────────────────────────────────────

async function cmdLogin() {
  const rt = await prompt('refresh token을 붙여넣어주세요: ');
  if (!rt) throw new Error('비어있음');
  const data = await reissue(rt);
  saveTokens(data.access_token, data.refresh_token);
  console.log('✅ 토큰 저장됨:', TOKENS_FILE);
}

function cmdWhoami() {
  const tokens = loadTokens();
  if (!tokens) {
    console.log('저장된 토큰 없음.');
    return;
  }
  const mask = (s) => (s ? s.slice(0, 8) + '...' + s.slice(-6) : '(없음)');
  console.log('API URL  :', API_URL);
  console.log('Saved at :', tokens.saved_at);
  console.log('Access   :', mask(tokens.access_token));
  console.log('Refresh  :', mask(tokens.refresh_token));
  console.log('File     :', TOKENS_FILE);
}

function cmdLogout() {
  clearTokens();
  console.log('✅ 토큰 삭제됨.');
}

// ─── main ──────────────────────────────────────────────

async function main() {
  const [, , cmd, ...rest] = process.argv;

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    console.log(`Cheftory API CLI

  node scripts/api.js GET <path>
  node scripts/api.js POST <path> [json-body]
  node scripts/api.js PUT <path> [json-body]
  node scripts/api.js DELETE <path>

  node scripts/api.js login          # refresh token 입력
  node scripts/api.js whoami         # 저장된 토큰 상태
  node scripts/api.js logout         # 토큰 삭제

  API URL: ${API_URL}
  (override: CHEFTORY_API_URL 환경변수)
`);
    return;
  }

  if (cmd === 'login') return cmdLogin();
  if (cmd === 'whoami') return cmdWhoami();
  if (cmd === 'logout') return cmdLogout();

  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  if (methods.includes(cmd.toUpperCase())) {
    const [urlPath, body] = rest;
    if (!urlPath) {
      console.error('경로가 필요해요. 예: node scripts/api.js GET /recipes');
      process.exit(1);
    }
    return callApi(cmd, urlPath, body);
  }

  console.error(`알 수 없는 명령: ${cmd}. \`node scripts/api.js help\` 참고.`);
  process.exit(1);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
