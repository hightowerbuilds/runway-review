import type { CodeProcessingSnapshot } from '../code-processing'

const TABLE_NAME = 'workspace_code_state'

type WorkspaceRow = {
  workspace_id: string
  state: CodeProcessingSnapshot
  updated_at: string
}

function getSupabaseEnvironment() {
  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  return {
    url: typeof url === 'string' ? url : '',
    anonKey: typeof anonKey === 'string' ? anonKey : '',
  }
}

function buildHeaders(anonKey: string) {
  return {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    'content-type': 'application/json',
    prefer: 'resolution=merge-duplicates,return=representation',
  }
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseEnvironment()
  return Boolean(url && anonKey)
}

export async function saveWorkspaceSnapshot(args: {
  workspaceId: string
  snapshot: CodeProcessingSnapshot
}) {
  const { url, anonKey } = getSupabaseEnvironment()
  if (!url || !anonKey) {
    return { ok: false as const, error: 'Supabase environment is not configured.' }
  }

  const response = await fetch(
    `${url}/rest/v1/${TABLE_NAME}?on_conflict=workspace_id`,
    {
      method: 'POST',
      headers: buildHeaders(anonKey),
      body: JSON.stringify([
        {
          workspace_id: args.workspaceId,
          state: args.snapshot,
        },
      ]),
    },
  )

  if (!response.ok) {
    const details = await response.text()
    return { ok: false as const, error: `Save failed (${response.status}): ${details}` }
  }

  return { ok: true as const }
}

export async function loadWorkspaceSnapshot(workspaceId: string) {
  const { url, anonKey } = getSupabaseEnvironment()
  if (!url || !anonKey) {
    return { ok: false as const, error: 'Supabase environment is not configured.' }
  }

  const response = await fetch(
    `${url}/rest/v1/${TABLE_NAME}?workspace_id=eq.${encodeURIComponent(workspaceId)}&select=state,updated_at&limit=1`,
    {
      method: 'GET',
      headers: buildHeaders(anonKey),
    },
  )

  if (!response.ok) {
    const details = await response.text()
    return { ok: false as const, error: `Load failed (${response.status}): ${details}` }
  }

  const rows = (await response.json()) as Array<Pick<WorkspaceRow, 'state' | 'updated_at'>>
  const row = rows[0]
  if (!row) {
    return { ok: true as const, snapshot: null }
  }

  return { ok: true as const, snapshot: row.state }
}
