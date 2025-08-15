// Lightweight LangSmith logging for frontend-only use.
// WARNING: Using LangSmith from the browser exposes your API key. Only enable with care.
// Set NEXT_PUBLIC_LANGSMITH_API_KEY and optional NEXT_PUBLIC_LANGSMITH_ENDPOINT/PROJECT.

type LangSmithClient = {
  createRun(params: {
    name: string;
    inputs: Record<string, unknown>;
    outputs?: Record<string, unknown>;
    extra?: Record<string, unknown>;
    run_type: string;
  }): Promise<void>;
};

type LangSmithModule = {
  Client: new (config: {
    apiUrl: string;
    apiKey: string | undefined;
    defaultProjectName: string;
  }) => LangSmithClient;
};

function isLangSmithModule(mod: unknown): mod is LangSmithModule {
  return (
    typeof mod === 'object' &&
    mod !== null &&
    'Client' in mod &&
    typeof (mod as Record<string, unknown>).Client === 'function'
  );
}

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
  if (!isTracingEnabled()) {
    return;
  }
  try {
    const mod = await import('langsmith');
    if (!isLangSmithModule(mod)) {
      throw new Error('Invalid LangSmith module structure');
    }
    const client = new mod.Client({
      apiUrl:
        process.env.NEXT_PUBLIC_LANGSMITH_ENDPOINT ??
        'https://api.smith.langchain.com',
      apiKey: process.env.NEXT_PUBLIC_LANGSMITH_API_KEY,
      defaultProjectName:
        process.env.NEXT_PUBLIC_LANGSMITH_PROJECT ?? 'verba-frontend',
    });
    const runParams: {
      name: string;
      inputs: Record<string, unknown>;
      outputs?: Record<string, unknown>;
      extra?: Record<string, unknown>;
      run_type: string;
    } = {
      name,
      inputs,
      run_type: 'chain',
    };

    if (outputs !== undefined) {
      runParams.outputs = outputs;
    }

    if (extra !== undefined) {
      runParams.extra = extra;
    }

    await client.createRun(runParams);
  } catch (_e) {}
}

export async function logFeedback(
  target: 'message' | 'run' | 'conversation',
  value: 'up' | 'down',
  details?: Record<string, unknown>
) {
  if (!isTracingEnabled()) {
    return;
  }
  try {
    const mod = await import('langsmith');
    if (!isLangSmithModule(mod)) {
      throw new Error('Invalid LangSmith module structure');
    }
    const client = new mod.Client({
      apiUrl:
        process.env.NEXT_PUBLIC_LANGSMITH_ENDPOINT ??
        'https://api.smith.langchain.com',
      apiKey: process.env.NEXT_PUBLIC_LANGSMITH_API_KEY,
      defaultProjectName:
        process.env.NEXT_PUBLIC_LANGSMITH_PROJECT ?? 'verba-frontend',
    });
    const feedbackParams: {
      name: string;
      inputs: Record<string, unknown>;
      outputs?: Record<string, unknown>;
      extra?: Record<string, unknown>;
      run_type: string;
    } = {
      name: 'feedback',
      inputs: { target, value },
      outputs: {},
      run_type: 'chain',
    };

    if (details !== undefined) {
      feedbackParams.extra = details;
    }

    await client.createRun(feedbackParams);
  } catch (_e) {}
}
