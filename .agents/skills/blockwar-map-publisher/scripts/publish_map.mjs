import { readFile } from 'node:fs/promises';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }
  return args;
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = { raw: text };
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    payload,
  };
}

async function ensureSession(origin, username, existingToken = '') {
  const headers = { 'Content-Type': 'application/json' };
  if (existingToken) {
    headers['x-blockwar-session'] = existingToken;
  }

  const session = await requestJson(`${origin}/api/session`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username }),
  });

  if (!session.ok || !session.payload?.token) {
    throw new Error(`Failed to create session: ${JSON.stringify(session.payload)}`);
  }

  return session.payload.token;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const origin = String(args.origin ?? 'https://blockwar.01mvp.com').replace(/\/$/, '');
  const username = String(args.username ?? 'jackie');
  const file = args.file;

  if (!file) {
    throw new Error('Missing required --file argument');
  }

  const source = await readFile(file, 'utf8');
  const map = JSON.parse(source);
  const token = await ensureSession(origin, username, process.env.BLOCKWAR_SESSION ?? '');

  const create = await requestJson(`${origin}/api/maps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-blockwar-session': token,
    },
    body: JSON.stringify(map),
  });

  if (!create.ok) {
    throw new Error(`Failed to publish map: ${JSON.stringify(create.payload)}`);
  }

  const verifyApi = await requestJson(`${origin}/api/maps/${map.id}`, {
    method: 'GET',
  });
  const verifyPage = await fetch(`${origin}/maps/${map.id}`, {
    method: 'GET',
  });

  if (!verifyApi.ok || verifyPage.status !== 200) {
    throw new Error(
      `Verification failed: api=${verifyApi.status}, page=${verifyPage.status}`
    );
  }

  console.log(
    JSON.stringify(
      {
        id: map.id,
        name: map.name,
        apiUrl: `${origin}/api/maps/${map.id}`,
        publicUrl: `${origin}/maps/${map.id}`,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
