// Lightweight LangSmith logging for frontend-only use.
// WARNING: Using LangSmith from the browser exposes your API key. Only enable with care.
// Set NEXT_PUBLIC_LANGSMITH_API_KEY and optional NEXT_PUBLIC_LANGSMITH_ENDPOINT/PROJECT.

export function isTracingEnabled() {
  return (
    typeof window !== 'undefined' &&
    Boolean(process.env.NEXT_PUBLIC_LANGSMITH_API_KEY)
  );
}

export async function logTrace(
  name: string,
  inputs: Record<string, unknown>,
  outputs?: Record<string, unknown>,
  extra?: Record<string, unknown>
) {
  if (!isTracingEnabled()) return;
  try {
    const mod = await import('langsmith');
    const client = new (mod as any).Client({
      apiUrl:
        process.env.NEXT_PUBLIC_LANGSMITH_ENDPOINT ??
        'https://api.smith.langchain.com',
      apiKey: process.env.NEXT_PUBLIC_LANGSMITH_API_KEY,
      defaultProjectName:
        process.env.NEXT_PUBLIC_LANGSMITH_PROJECT ?? 'verba-frontend',
    });
    await client.createRun({
      name,
      inputs,
      outputs,
      extra,
      run_type: 'chain',
    });
  } catch (e) {
    console.warn('LangSmith log failed', e);
  }
}

export async function logFeedback(
  target: 'message' | 'run' | 'conversation',
  value: 'up' | 'down',
  details?: Record<string, unknown>
) {
  if (!isTracingEnabled()) return;
  try {
    const mod = await import('langsmith');
    const client = new (mod as any).Client({
      apiUrl:
        process.env.NEXT_PUBLIC_LANGSMITH_ENDPOINT ??
        'https://api.smith.langchain.com',
      apiKey: process.env.NEXT_PUBLIC_LANGSMITH_API_KEY,
      defaultProjectName:
        process.env.NEXT_PUBLIC_LANGSMITH_PROJECT ?? 'verba-frontend',
    });
    await client.createRun({
      name: 'feedback',
      inputs: { target, value },
      outputs: {},
      extra: details,
      run_type: 'chain',
    });
  } catch (e) {
    console.warn('LangSmith feedback failed', e);
  }
}
