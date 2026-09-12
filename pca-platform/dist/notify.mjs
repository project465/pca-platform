// scripts/notify.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// src/lib/db.ts
import { Pool } from "pg";
function getPool() {
  if (global.__pcaPool) return global.__pcaPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL \uC774 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. .env.local \uC744 \uD655\uC778\uD558\uC138\uC694.");
  }
  const pool = new Pool({ connectionString, max: 10, idleTimeoutMillis: 3e4 });
  global.__pcaPool = pool;
  return pool;
}
async function query(text, params = []) {
  const res = await getPool().query(text, params);
  return res.rows;
}
async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}
async function tx(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// src/lib/anon.ts
var DEGREE_LABEL = {
  master: "\uC11D\uC0AC",
  phd: "\uBC15\uC0AC"
};
var CAREER_PATH_LABEL = {
  industry_rnd: "\uC0B0\uC5C5\uACC4 R&D",
  industry_biz: "\uC0B0\uC5C5\uACC4 \uBE44R&D",
  research_inst: "\uC815\uBD80\uCD9C\uC5F0\uC5F0\uAD6C\uAE30\uAD00",
  academia: "\uB300\uD559\xB7\uD559\uACC4",
  startup: "\uCC3D\uC5C5\xB7\uC2A4\uD0C0\uD2B8\uC5C5",
  public_policy: "\uACF5\uACF5\xB7\uC815\uCC45"
};
function labelFrom(map, v) {
  return map[v] ?? v;
}
var degreeLabel = (v) => labelFrom(DEGREE_LABEL, v);
var careerPathLabel = (v) => labelFrom(CAREER_PATH_LABEL, v);
function mentorTitle(m) {
  return `${m.alias} \xB7 ${mentorFacets(m)}`;
}
function mentorFacets(m) {
  return `${degreeLabel(m.degree)} \xB7 ${careerPathLabel(m.career_path)} ${m.years}\uB144\uCC28`;
}

// src/lib/notify.ts
var KST_DATE = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "full",
  timeStyle: "short",
  timeZone: "Asia/Seoul"
});
function formatSlot(d) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul"
  }).format(d);
}
async function enqueue(client, row) {
  const channel = row.recipientEmail ? "email" : "inapp";
  await client.query(
    `INSERT INTO notifications
       (request_id, recipient_id, channel, kind, dedupe_key, subject, body, send_after, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $3 = 'inapp' THEN now() ELSE NULL END)
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [
      row.requestId,
      row.recipientId,
      channel,
      row.kind,
      `${row.requestId}:${row.recipientId}:${row.kind}`,
      row.subject,
      row.body,
      row.sendAfter ?? /* @__PURE__ */ new Date()
    ]
  );
}
function expiredToApplicant(m) {
  return {
    subject: `[\uD604\uBA58] \uC751\uB2F5 \uAE30\uD55C\uC774 \uC9C0\uB098 \uC2E0\uCCAD\uC774 \uB2EB\uD614\uC2B5\uB2C8\uB2E4 \u2014 ${formatSlot(m.startsAt)}`,
    body: [
      `${m.mentorTitle} \uB2D8\uC774 24\uC2DC\uAC04 \uC548\uC5D0 \uC751\uB2F5\uD558\uC9C0 \uC54A\uC544 \uC2E0\uCCAD\uC744 \uB2EB\uC558\uC2B5\uB2C8\uB2E4.`,
      `\uAE30\uB2E4\uB9AC\uC2E0 \uC2DC\uAC04\uC5D0 \uB300\uD574 \uC8C4\uC1A1\uD569\uB2C8\uB2E4.`,
      ``,
      `\uADF8 \uC2DC\uAC04\uB300\uB294 \uB2E4\uC2DC \uC5F4\uB838\uACE0, \uB2E4\uB978 \uBA58\uD1A0\uC5D0\uAC8C \uBC14\uB85C \uC2E0\uCCAD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`
    ].join("\n")
  };
}

// src/lib/pay.ts
var API = "https://api.tosspayments.com/v1";
var PayError = class extends Error {
};
function payConfigured() {
  return Boolean(process.env.TOSS_SECRET_KEY && process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY);
}
function payDryRun() {
  return process.env.PAYMENTS_DRY_RUN === "1";
}
function auth() {
  return `Basic ${Buffer.from(`${process.env.TOSS_SECRET_KEY}:`).toString("base64")}`;
}
async function cancel(providerKey, reason, amount) {
  if (payDryRun() || providerKey.startsWith("dry_")) return;
  if (!payConfigured()) throw new PayError("\uACB0\uC81C \uC5F0\uB3D9\uC774 \uC124\uC815\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
  const res = await fetch(`${API}/payments/${encodeURIComponent(providerKey)}/cancel`, {
    method: "POST",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      cancelReason: reason.slice(0, 200),
      ...amount !== void 0 ? { cancelAmount: amount } : {}
    })
  });
  if (res.ok) return;
  const json = await res.json().catch(() => ({}));
  if (json.code === "ALREADY_CANCELED_PAYMENT") return;
  throw new PayError(json.message ?? `\uACB0\uC81C \uCDE8\uC18C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4 (${res.status}).`);
}

// src/lib/refund.ts
async function refundRules() {
  return query(
    `SELECT hours_before, percent FROM refund_rules ORDER BY hours_before DESC`
  );
}
function percentFor(rules, hoursLeft) {
  for (const r of rules) {
    if (hoursLeft >= r.hours_before) return r.percent;
  }
  return 0;
}
async function payoutSettings() {
  const row = await queryOne(
    `SELECT fee_percent::text, withholding_percent::text, hold_hours FROM payout_settings WHERE id = 1`
  );
  return row ?? { fee_percent: "0", withholding_percent: "0", hold_hours: 48 };
}

// src/lib/billing.ts
async function refundFor(requestId, reason, opts = {}) {
  const p = await queryOne(
    `SELECT p.id, p.provider_key, p.status, p.amount, s.starts_at::text
       FROM payments p
       JOIN mentoring_requests r ON r.id = p.request_id
       JOIN mentor_slots s ON s.id = r.slot_id
      WHERE p.request_id = $1`,
    [requestId]
  );
  if (!p) return;
  let refund = p.amount;
  if (opts.byApplicant && p.status === "paid") {
    const hoursLeft = (new Date(p.starts_at).getTime() - Date.now()) / 36e5;
    const pct = percentFor(await refundRules(), hoursLeft);
    refund = Math.floor(p.amount * pct / 100);
  }
  if (p.status === "paid" && p.provider_key && refund > 0) {
    await query(`UPDATE payments SET refund_due = $2 WHERE id = $1`, [p.id, refund]);
    try {
      await cancel(p.provider_key, reason, refund < p.amount ? refund : void 0);
    } catch (e) {
      await query(`UPDATE payments SET fail_reason = $2, cancel_reason = $3 WHERE id = $1`, [
        p.id,
        e instanceof PayError ? e.message : "\uACB0\uC81C \uCDE8\uC18C \uC2E4\uD328",
        reason.slice(0, 200)
      ]);
      return;
    }
  }
  if (p.status === "paid" || p.status === "ready") {
    const fully = refund >= p.amount || p.status === "ready";
    await query(
      `UPDATE payments
          SET status = CASE WHEN $3 THEN 'cancelled' ELSE status END,
              refunded_amount = $4,
              cancel_reason = $2,
              cancelled_at = CASE WHEN $3 THEN now() ELSE cancelled_at END,
              -- \uC9C0\uB09C\uBC88\uC5D0 \uC2E4\uD328\uD588\uB354\uB77C\uB3C4 \uC774\uBC88\uC5D0 \uC131\uACF5\uD588\uC73C\uBA74 \uAE30\uB85D\uC744 \uC9C0\uC6B4\uB2E4.
              -- \uB0A8\uACA8\uB450\uBA74 \uC6B4\uC601 \uD654\uBA74\uC758 '\uD658\uBD88 \uC2E4\uD328' \uBAA9\uB85D\uC5D0\uC11C \uC601\uC601 \uC0AC\uB77C\uC9C0\uC9C0 \uC54A\uB294\uB2E4
              fail_reason = NULL
        WHERE id = $1`,
      [p.id, reason.slice(0, 200), fully, p.status === "ready" ? 0 : refund]
    );
  }
}

// src/lib/mentoring.ts
async function expireStaleRequests() {
  const expired = await tx(async (c) => {
    const rows = await c.query(
      `UPDATE mentoring_requests r
          SET status = 'expired', decided_at = now()
         FROM mentor_slots s, mentors m, users u
        WHERE r.status = 'requested'
          AND (r.respond_by < now() OR s.starts_at < now())
          AND s.id = r.slot_id AND m.id = r.mentor_id AND u.id = r.applicant_id
        RETURNING r.id, r.slot_id, s.starts_at::text, r.applicant_id,
                  m.alias, m.years, m.degree, m.career_path, u.email`
    );
    for (const row of rows.rows) {
      await c.query(
        `UPDATE mentor_slots
            SET status = CASE WHEN starts_at > now() + interval '1 hour' THEN 'open' ELSE 'closed' END
          WHERE id = $1`,
        [row.slot_id]
      );
      await enqueue(c, {
        requestId: row.id,
        recipientId: row.applicant_id,
        recipientEmail: row.email,
        kind: "expired",
        ...expiredToApplicant({
          startsAt: new Date(row.starts_at),
          mentorTitle: mentorTitle(row)
        })
      });
    }
    return rows.rows.map((r) => r.id);
  });
  for (const id of expired) await refundFor(id, "\uBA58\uD1A0 \uBB34\uC751\uB2F5\uC73C\uB85C \uAE30\uD55C \uCD08\uACFC");
  return expired.length;
}
async function completeDueSessions() {
  const rows = await query(
    `UPDATE mentoring_requests r
        SET status = 'completed'
       FROM mentor_slots s, mentors m
      WHERE r.status = 'accepted'
        AND s.id = r.slot_id AND m.id = r.mentor_id
        AND s.starts_at + (m.session_minutes || ' minutes')::interval < now()
      RETURNING r.id`
  );
  return rows.length;
}

// src/lib/payout.ts
async function buildPayouts() {
  const s = await payoutSettings();
  const fee = Number(s.fee_percent);
  const wh = Number(s.withholding_percent);
  if (fee <= 0) {
    return { made: 0, skipped: "\uC218\uC218\uB8CC\uC728\uC774 \uC124\uC815\uB418\uC9C0 \uC54A\uC544 \uC815\uC0B0 \uAC74\uC744 \uB9CC\uB4E4\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." };
  }
  const hold = Number(s.hold_hours);
  const rows = await query(
    `INSERT INTO payouts (mentor_id, request_id, gross, fee, withholding, net)
     SELECT r.mentor_id, r.id,
            (p.amount - p.refunded_amount) AS gross,
            floor((p.amount - p.refunded_amount) * $1 / 100) AS fee,
            floor(((p.amount - p.refunded_amount)
                   - floor((p.amount - p.refunded_amount) * $1 / 100)) * $2 / 100) AS withholding,
            (p.amount - p.refunded_amount)
              - floor((p.amount - p.refunded_amount) * $1 / 100)
              - floor(((p.amount - p.refunded_amount)
                       - floor((p.amount - p.refunded_amount) * $1 / 100)) * $2 / 100) AS net
       FROM mentoring_requests r
       JOIN payments p ON p.request_id = r.id
       JOIN mentor_slots s ON s.id = r.slot_id
       JOIN mentors mm ON mm.id = r.mentor_id
      WHERE p.status = 'paid'
        AND (p.amount - p.refunded_amount) > 0
        AND (
              -- \uC138\uC158\uC744 \uD55C \uAC74. \uB178\uC1FC \uC2E0\uACE0 \uAE30\uAC04\uC774 \uC9C0\uB098\uC57C \uC7A1\uB294\uB2E4
              (r.status = 'completed'
               AND s.starts_at + (mm.session_minutes || ' minutes')::interval
                     + ($3 || ' hours')::interval <= now())
              -- \uC2E0\uCCAD\uC790\uAC00 \uB2A6\uAC8C \uCDE8\uC18C\uD574 \uB0A8\uC740 \uB3C8
           OR (r.status = 'cancelled'
               AND s.starts_at <= now()
               AND NOT EXISTS (SELECT 1 FROM mentoring_requests r2
                                WHERE r2.slot_id = r.slot_id
                                  AND r2.id <> r.id
                                  AND r2.status IN ('accepted', 'completed')))
              -- \uC2E0\uCCAD\uC790 \uB178\uC1FC\uAC00 \uC778\uC815\uB41C \uAC74. \uBA58\uD1A0\uB294 \uADF8 \uC2DC\uAC04\uC744 \uBE44\uC6E0\uB2E4
           OR (r.status = 'no_show'
               AND EXISTS (SELECT 1 FROM no_show_reports n
                            WHERE n.request_id = r.id
                              AND n.against = 'applicant'
                              AND n.resolution = 'accepted'))
            )
        AND NOT EXISTS (SELECT 1 FROM payouts o WHERE o.request_id = r.id)
     RETURNING id`,
    [fee, wh, hold]
  );
  return { made: rows.length, skipped: null };
}

// scripts/notify.ts
function loadEnv(file) {
  try {
    for (const line of readFileSync(resolve(process.cwd(), file), "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
  }
}
loadEnv(".env.local");
var DRY = process.argv.includes("--dry");
var BATCH = 50;
async function due() {
  return query(
    `SELECT n.id, n.kind, n.subject, n.body, u.email, u.display_name
       FROM notifications n
       JOIN users u ON u.id = n.recipient_id
       LEFT JOIN mentoring_requests r ON r.id = n.request_id
      WHERE n.sent_at IS NULL
        AND n.channel = 'email'
        AND n.send_after <= now()
        AND u.email IS NOT NULL
        -- \uCDE8\uC18C\xB7\uAC70\uC808\uB41C \uAC74\uC758 \uB9AC\uB9C8\uC778\uB354\uB294 \uBCF4\uB0B4\uC9C0 \uC54A\uB294\uB2E4
        AND (n.kind NOT IN ('reminder_24h', 'reminder_1h') OR r.status = 'accepted')
      ORDER BY n.send_after
      LIMIT ${BATCH}`
  );
}
async function send(row) {
  const url = process.env.MAIL_WEBHOOK_URL;
  if (!url) throw new Error("MAIL_WEBHOOK_URL \uC774 \uC5C6\uC2B5\uB2C8\uB2E4");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...process.env.MAIL_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.MAIL_WEBHOOK_TOKEN}` } : {}
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM || "no-reply@careerpeak.co.kr",
      to: row.email,
      subject: row.subject,
      text: row.body
    })
  });
  if (!res.ok) {
    throw new Error(`\uBC1C\uC1A1 \uC2E4\uD328 (${res.status}) ${(await res.text().catch(() => "")).slice(0, 200)}`);
  }
}
async function main() {
  const expired = await expireStaleRequests();
  const completed = await completeDueSessions();
  const payouts = await buildPayouts();
  if (expired > 0) console.log(`\uAE30\uD55C \uCD08\uACFC\uB85C \uB2EB\uC740 \uC2E0\uCCAD ${expired}\uAC74`);
  if (completed > 0) console.log(`\uC644\uB8CC \uCC98\uB9AC\uD55C \uC138\uC158 ${completed}\uAC74`);
  if (payouts.made > 0) console.log(`\uC815\uC0B0 ${payouts.made}\uAC74`);
  const rows = await due();
  if (rows.length === 0) {
    console.log("\uBCF4\uB0BC \uC54C\uB9BC\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }
  if (!DRY && !process.env.MAIL_WEBHOOK_URL) {
    console.log(`MAIL_WEBHOOK_URL \uC774 \uC5C6\uC5B4 ${rows.length}\uAC74\uC744 \uD050\uC5D0 \uADF8\uB300\uB85C \uB450\uC5C8\uC2B5\uB2C8\uB2E4.`);
    console.log("\uC8FC\uC18C\uB97C \uB123\uC73C\uBA74 \uB2E4\uC74C \uC2E4\uD589\uC5D0\uC11C \uD55C\uAEBC\uBC88\uC5D0 \uB098\uAC11\uB2C8\uB2E4. \uC0AC\uB77C\uC9C4 \uC54C\uB9BC\uC740 \uC5C6\uC2B5\uB2C8\uB2E4.");
    return;
  }
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    if (DRY) {
      console.log(`
--- [${row.kind}] \u2192 ${row.email}
${row.subject}
${row.body}`);
      continue;
    }
    try {
      await send(row);
      await query(`UPDATE notifications SET sent_at = now(), attempts = attempts + 1 WHERE id = $1`, [
        row.id
      ]);
      sent++;
    } catch (e) {
      await query(
        `UPDATE notifications SET attempts = attempts + 1, last_error = $2 WHERE id = $1`,
        [row.id, e instanceof Error ? e.message : String(e)]
      );
      failed++;
    }
  }
  if (DRY) console.log(`
(--dry) ${rows.length}\uAC74\uC774 \uB300\uAE30 \uC911\uC785\uB2C8\uB2E4. \uC544\uBB34\uAC83\uB3C4 \uBCF4\uB0B4\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.`);
  else console.log(`\uBC1C\uC1A1 ${sent}\uAC74, \uC2E4\uD328 ${failed}\uAC74.`);
}
main().then(
  () => process.exit(0),
  (e) => {
    console.error(e);
    process.exit(1);
  }
);
