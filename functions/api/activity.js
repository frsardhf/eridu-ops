const ALLOWED_DAYS = new Set([7, 30, 90]);
const DEFAULT_DATASET = 'eridu_ops_events';

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function datasetName(env) {
  const value = env.ANALYTICS_DATASET ?? DEFAULT_DATASET;
  return /^[A-Za-z0-9_]+$/.test(value) ? value : DEFAULT_DATASET;
}

async function queryAnalytics(env, sql) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
        'Content-Type': 'text/plain',
      },
      body: sql,
    },
  );
  if (!response.ok) throw new Error(`Analytics SQL API returned ${response.status}`);
  return response.json();
}

function rows(result) {
  return Array.isArray(result?.data) ? result.data : [];
}

export async function onRequestGet(context) {
  if (!context.env.CF_ACCOUNT_ID || !context.env.CF_ANALYTICS_TOKEN) {
    return json({ error: 'Activity manager is not configured.' }, 503);
  }

  const url = new URL(context.request.url);
  const requestedDays = Number(url.searchParams.get('days') ?? 7);
  const days = ALLOWED_DAYS.has(requestedDays) ? requestedDays : 7;
  const dataset = datasetName(context.env);
  const period = `timestamp > NOW() - INTERVAL '${days}' DAY`;

  const summarySql = `
    SELECT
      SUM(_sample_interval * double1) AS events,
      COUNT(DISTINCT index1) AS sessions,
      SUM(if(blob1 = 'workflow_completed', _sample_interval * double1, 0.0)) AS completed,
      SUM(if(blob1 = 'workflow_failed', _sample_interval * double1, 0.0)) AS failed
    FROM ${dataset}
    WHERE ${period}
  `;
  const dailySql = `
    SELECT
      formatDateTime(toStartOfDay(timestamp), '%Y-%m-%d') AS day,
      SUM(_sample_interval * double1) AS events,
      COUNT(DISTINCT index1) AS sessions
    FROM ${dataset}
    WHERE ${period}
    GROUP BY day
    ORDER BY day ASC
  `;
  const topSql = `
    SELECT
      blob1 AS name,
      blob2 AS route,
      blob3 AS feature,
      blob4 AS action,
      SUM(_sample_interval * double1) AS count
    FROM ${dataset}
    WHERE ${period}
    GROUP BY name, route, feature, action
    ORDER BY count DESC
    LIMIT 12
  `;
  const recentSql = `
    SELECT
      timestamp,
      blob1 AS name,
      blob2 AS route,
      blob3 AS feature,
      blob4 AS action,
      blob5 AS locale,
      blob6 AS device,
      double1 AS count
    FROM ${dataset}
    WHERE ${period}
    ORDER BY timestamp DESC
    LIMIT 30
  `;

  try {
    const [summaryResult, dailyResult, topResult, recentResult] = await Promise.all([
      queryAnalytics(context.env, summarySql),
      queryAnalytics(context.env, dailySql),
      queryAnalytics(context.env, topSql),
      queryAnalytics(context.env, recentSql),
    ]);
    const summary = rows(summaryResult)[0] ?? {};

    return json({
      days,
      generatedAt: new Date().toISOString(),
      summary: {
        events: Number(summary.events ?? 0),
        sessions: Number(summary.sessions ?? 0),
        completed: Number(summary.completed ?? 0),
        failed: Number(summary.failed ?? 0),
      },
      daily: rows(dailyResult),
      top: rows(topResult),
      recent: rows(recentResult),
    });
  } catch (error) {
    console.error('Failed to query activity analytics:', error);
    return json({ error: 'Activity data is unavailable.' }, 502);
  }
}
