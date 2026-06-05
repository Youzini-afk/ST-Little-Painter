import { TRACE_LIMIT, TRACE_STATUS } from '../core/constants.js';

const traces = [];
const SENSITIVE_KEYS = /(?:api[_-]?key|authorization|bearer|cookie|password|secret|token|key|dataurl|data_url|base64|b64_json|image)$/i;
const REDACTED = '[REDACTED]';

function clone(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

function redactValue(value, parentKey = '') {
  if (value === null || value === undefined) {
    return value;
  }

  if (SENSITIVE_KEYS.test(parentKey)) {
    return REDACTED;
  }

  if (typeof value === 'string') {
    return value
      .replace(/data:image\/[^;]+;base64,[a-z0-9+/=\r\n]+/gi, '[REDACTED_DATA_URL]')
      .replace(/(bearer\s+)[a-z0-9._~+/=-]+/gi, `$1${REDACTED}`)
      .replace(/(api[_-]?key\s*[:=]\s*)[^\s,"'}]+/gi, `$1${REDACTED}`)
      .replace(/(authorization\s*[:=]\s*)[^\n,"'}]+/gi, `$1${REDACTED}`);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, parentKey));
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, redactValue(nestedValue, key)]),
    );
  }

  return value;
}

function sanitize(value) {
  return redactValue(clone(value));
}

function pushTrace(trace) {
  traces.unshift(trace);
  if (traces.length > TRACE_LIMIT) {
    traces.splice(TRACE_LIMIT);
  }
}

export function createTrace(label = 'manual', metadata = {}) {
  const trace = {
    id: `stlp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    status: TRACE_STATUS.RUNNING,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    metadata: sanitize(metadata),
    steps: [],
  };

  pushTrace(trace);
  return clone(trace);
}

export function addTraceStep(traceOrId, name, payload = {}) {
  const trace = resolveTrace(traceOrId);
  if (!trace) {
    return null;
  }

  const step = {
    name,
    timestamp: new Date().toISOString(),
    payload: sanitize(payload),
  };

  trace.steps.push(step);
  return clone(step);
}

export function finalizeTrace(traceOrId, status = TRACE_STATUS.SUCCESS, summary = {}) {
  const trace = resolveTrace(traceOrId);
  if (!trace) {
    return null;
  }

  trace.status = status;
  trace.finishedAt = new Date().toISOString();
  trace.summary = sanitize(summary);
  return clone(trace);
}

export function getLatestTrace() {
  return clone(traces[0] ?? null);
}

export function getTraceHistory(limit = TRACE_LIMIT) {
  const count = Math.max(0, Number(limit) || TRACE_LIMIT);
  return clone(traces.slice(0, count));
}

export function getTraceById(id) {
  return clone(traces.find((trace) => trace.id === id) ?? null);
}

export function exportLatestTrace() {
  const latest = getLatestTrace();
  return latest ? JSON.stringify(latest, null, 2) : '';
}

export function exportTrace(id) {
  const trace = id ? getTraceById(id) : getLatestTrace();
  return trace ? JSON.stringify(trace, null, 2) : '';
}

function resolveTrace(traceOrId) {
  const traceId = typeof traceOrId === 'string' ? traceOrId : traceOrId?.id;
  return traces.find((trace) => trace.id === traceId) ?? null;
}
