const EVENT_NAMES = new Set([
  'page_view',
  'feature_opened',
  'workflow_completed',
  'workflow_failed',
  'setting_changed',
  'filter_changed',
  'plan_action',
  'export_completed',
]);
const ROUTES = new Set(['landing', 'students', 'bonds', 'crafting', 'hall', 'chibi3d']);
const FEATURES = new Set([
  '',
  'navigation',
  'preferences',
  'inventory',
  'inventory_scanner',
  'data_transfer',
  'student_modal',
  'apply_upgrade',
  'bulk_modify',
  'bond_update',
  'deck_builder',
  'equipment_farming',
  'bond_planner',
  'crafting_plan',
  'hall_entries',
  'hall_submission',
  'hall_export',
  'chibi_room',
]);
const ACTIONS = new Set([
  '',
  'opened',
  'changed',
  'refreshed',
  'reset',
  'adjusted',
  'tracked',
  'untracked',
  'converted',
  'synced',
  'applied',
  'submitted',
  'selected',
  'played',
  'imported',
  'exported',
  'scanned',
]);
const LOCALES = new Set(['en', 'jp', 'kr']);
const DEVICES = new Set(['desktop', 'tablet', 'mobile']);
const MAX_BODY_BYTES = 16384;
const MAX_EVENTS = 20;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validEvent(event) {
  return (
    isRecord(event) &&
    EVENT_NAMES.has(event.name) &&
    ROUTES.has(event.route) &&
    FEATURES.has(event.feature ?? '') &&
    ACTIONS.has(event.action ?? '') &&
    LOCALES.has(event.locale) &&
    DEVICES.has(event.device) &&
    Number.isInteger(event.count) &&
    event.count >= 1 &&
    event.count <= 1000
  );
}

function emptyResponse(status = 204) {
  return new Response(null, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost(context) {
  const requestOrigin = context.request.headers.get('Origin');
  if (requestOrigin !== new URL(context.request.url).origin) return emptyResponse(403);

  const length = Number(context.request.headers.get('Content-Length') ?? 0);
  if (length > MAX_BODY_BYTES) return emptyResponse(413);

  let body;
  try {
    const raw = await context.request.text();
    if (raw.length > MAX_BODY_BYTES) return emptyResponse(413);
    body = JSON.parse(raw);
  } catch {
    return emptyResponse(400);
  }

  if (
    !isRecord(body) ||
    typeof body.session !== 'string' ||
    !/^[a-f0-9]{24}$/.test(body.session) ||
    !Array.isArray(body.events) ||
    body.events.length < 1 ||
    body.events.length > MAX_EVENTS ||
    !body.events.every(validEvent)
  ) {
    return emptyResponse(400);
  }

  const dataset = context.env.ANALYTICS;
  if (!dataset) return emptyResponse(503);

  for (const event of body.events) {
    dataset.writeDataPoint({
      indexes: [body.session],
      blobs: [
        event.name,
        event.route,
        event.feature ?? '',
        event.action ?? '',
        event.locale,
        event.device,
      ],
      doubles: [event.count],
    });
  }

  return emptyResponse();
}
