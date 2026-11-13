import test from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

// Independently authored from T007-readonly-v1; no implementation is read.
const moduleUrl = process.env.COCO_T007_MODULE
  ? pathToFileURL(process.env.COCO_T007_MODULE).href
  : new URL('./evidence.mjs', import.meta.url).href;
const { evaluateSnapshot } = await import(moduleUrl);

const SHA = 'a'.repeat(40);
const OLD_SHA = 'b'.repeat(40);
const REPOSITORY = 'fixture-org/fixture-repo';
const BOT = { id: 199175422, login: 'chatgpt-codex-connector[bot]', type: 'Bot' };
const EARLIER = '2026-11-12T01:00:00Z';
const LATER = '2026-11-12T02:00:00Z';

function summary(overrides = {}) {
  const state = {
    commit_sha: SHA,
    status: 'completed',
    has_any_findings: false,
    has_unresolved_findings: false,
    ...overrides,
  };
  return '<!-- codex-pull-request-review-summary -->\n'
    + `<!-- codex-review-state:v1 ${JSON.stringify({ code_review: state })} -->`;
}

function comment(overrides = {}) {
  return {
    id: 101,
    html_url: `https://github.com/${REPOSITORY}/pull/2#issuecomment-101`,
    updated_at: LATER,
    user: { ...BOT },
    body: summary(),
    ...overrides,
  };
}

function check(overrides = {}) {
  return {
    id: 201,
    name: 'docs-integrity',
    head_sha: SHA,
    status: 'completed',
    conclusion: 'success',
    started_at: EARLIER,
    completed_at: LATER,
    app: { id: 15368 },
    ...overrides,
  };
}

function fixture() {
  const pr = {
    number: 2,
    base: { repo: { id: 10, full_name: REPOSITORY } },
    head: { repo: { id: 11 }, sha: SHA },
  };
  return {
    policy: {
      repository_id: 10,
      repository_full_name: REPOSITORY,
      pr_number: 2,
      head_repository_id: 11,
      head_sha: SHA,
      reviewer: { ...BOT },
      required_checks: [{ name: 'docs-integrity', app_id: 15368 }],
    },
    snapshot: {
      captured_at: '2026-11-12T03:00:00Z',
      pr_before: structuredClone(pr),
      pr_after: structuredClone(pr),
      comments: {
        source: { repository_id: 10, pr_number: 2 },
        complete: true,
        error: null,
        items: [comment()],
      },
      checks: {
        source: { repository_id: 10, head_sha: SHA },
        complete: true,
        error: null,
        items: [check()],
      },
    },
  };
}

function evaluate(data) {
  const output = evaluateSnapshot(data.snapshot, data.policy);
  assert.equal(output.contractVersion, 'T007-readonly-v1');
  assert.deepEqual(output.target, {
    repository_id: data.policy.repository_id,
    pr_number: data.policy.pr_number,
    head_sha: data.policy.head_sha,
  });
  assert.equal(output.merge_authorized, false);
  for (const channel of ['review', 'ci']) {
    assert.ok(['PASS', 'CHANGES_REQUESTED', 'INCONCLUSIVE', 'UNAVAILABLE'].includes(output[channel].status));
    assert.ok(Array.isArray(output[channel].reasons));
    assert.ok(Array.isArray(output[channel].evidence_ids));
    if (output[channel].status !== 'PASS') {
      assert.ok(output[channel].reasons.length > 0, `${channel}: missing diagnostic reasons`);
      assert.ok(output[channel].reasons.every(reason => typeof reason === 'string' && reason.trim().length > 0));
    }
  }
  return output;
}

function expectStatus(data, channel, expected) {
  const output = evaluate(data);
  assert.equal(output[channel].status, expected);
  return output;
}

function references(output, channel, id) {
  assert.ok(output[channel].evidence_ids.some(value => String(value) === String(id)));
}

test('01: complete current-head trusted summary and required check pass independently', () => {
  const data = fixture();
  const original = structuredClone(data);
  const output = evaluate(data);
  assert.equal(output.review.status, 'PASS');
  assert.equal(output.ci.status, 'PASS');
  references(output, 'review', 101);
  references(output, 'ci', 201);
  assert.deepEqual(data, original, 'evaluation must preserve its evidence inputs');
  assert.deepEqual(evaluate(data), output, 'the same snapshot and policy must give the same output');
  data.snapshot.comments.items[0].html_url = `https://github.com/${REPOSITORY}/issues/2#issuecomment-101`;
  expectStatus(data, 'review', 'PASS');
});

test('02: current completed unresolved findings request changes; ambiguous flag combinations do not pass', async t => {
  for (const [flags, expected] of [
    [{ has_any_findings: true, has_unresolved_findings: true }, 'CHANGES_REQUESTED'],
    [{ has_any_findings: true, has_unresolved_findings: false }, 'INCONCLUSIVE'],
    [{ has_any_findings: false, has_unresolved_findings: true }, 'INCONCLUSIVE'],
  ]) {
    await t.test(JSON.stringify(flags), () => {
      const data = fixture();
      data.snapshot.comments.items[0].body = summary(flags);
      const output = expectStatus(data, 'review', expected);
      assert.equal(output.ci.status, 'PASS');
    });
  }
});

test('03: no review comments or reactions alone never constitute review completion', async t => {
  for (const items of [[], [comment({ body: '👍', reactions: { '+1': 3 } })]]) {
    await t.test(items.length ? 'reactions only' : 'empty collection', () => {
      const data = fixture();
      data.snapshot.comments.items = items;
      expectStatus(data, 'review', 'INCONCLUSIVE');
    });
  }
});

test('04: spoofed or mismatched reviewer identity cannot supply completion', async t => {
  for (const user of [
    { ...BOT, id: 999 },
    { ...BOT, login: 'different-bot[bot]' },
    { ...BOT, type: 'User' },
  ]) {
    await t.test(JSON.stringify(user), () => {
      const data = fixture();
      data.snapshot.comments.items[0].user = user;
      expectStatus(data, 'review', 'INCONCLUSIVE');
    });
  }
});

test('05: review requires the supported machine markers and every necessary typed field', async t => {
  const missing = key => {
    const state = { commit_sha: SHA, status: 'completed', has_any_findings: false, has_unresolved_findings: false };
    delete state[key];
    return '<!-- codex-pull-request-review-summary -->\n'
      + `<!-- codex-review-state:v1 ${JSON.stringify({ code_review: state })} -->`;
  };
  const bodies = [
    'Codex completed the review and found no issues.',
    'The following is an example, not a completed review:\n' + summary(),
    '```html\n' + summary() + '\n```',
    summary().split('\n').map(line => '> ' + line).join('\n'),
    summary() + '\n' + summary(),
    summary().replace('codex-review-state:v1', 'codex-review-state:v2'),
    summary().replace('<!-- codex-pull-request-review-summary -->\n', ''),
    '<!-- codex-pull-request-review-summary -->\n<!-- codex-review-state:v1 {bad json} -->',
    ...['commit_sha', 'status', 'has_any_findings', 'has_unresolved_findings'].map(missing),
    summary({ has_any_findings: 'false' }),
    summary({ status: 'in_progress' }),
    summary({ status: 'unknown' }),
  ];
  for (const [index, body] of bodies.entries()) {
    await t.test(`invalid summary ${index}`, () => {
      const data = fixture();
      data.snapshot.comments.items[0].body = body;
      expectStatus(data, 'review', 'INCONCLUSIVE');
    });
  }
});

test('06: comment URL must bind the same repository, PR and comment identifier', async t => {
  for (const url of [
    'https://github.com/other/repository/pull/2#issuecomment-101',
    `https://github.com/${REPOSITORY}/pull/3#issuecomment-101`,
    `https://github.com/${REPOSITORY}/pull/2#issuecomment-999`,
    `https://example.com/${REPOSITORY}/pull/2#issuecomment-101`,
  ]) {
    await t.test(url, () => {
      const data = fixture();
      data.snapshot.comments.items[0].html_url = url;
      expectStatus(data, 'review', 'INCONCLUSIVE');
    });
  }
});

test('07: old-SHA review cannot become current by recency or overwrite current evidence', () => {
  const data = fixture();
  data.snapshot.comments.items = [comment({ body: summary({ commit_sha: OLD_SHA }) })];
  expectStatus(data, 'review', 'INCONCLUSIVE');
  data.snapshot.comments.items.unshift(comment({
    id: 100,
    html_url: `https://github.com/${REPOSITORY}/pull/2#issuecomment-100`,
    updated_at: EARLIER,
  }));
  expectStatus(data, 'review', 'INCONCLUSIVE');
});

test('08: latest summary wins without fallback, and ambiguous review ordering is inconclusive', async t => {
  const older = comment({
    id: 100,
    html_url: `https://github.com/${REPOSITORY}/pull/2#issuecomment-100`,
    updated_at: EARLIER,
  });
  for (const newer of [
    comment({ body: summary({ status: 'in_progress' }) }),
    comment({ body: summary({ has_any_findings: true, has_unresolved_findings: true }) }),
    comment({ updated_at: EARLIER }),
    comment({ updated_at: 'not-a-date' }),
  ]) {
    await t.test(JSON.stringify(newer), () => {
      const data = fixture();
      data.snapshot.comments.items = [older, newer];
      expectStatus(data, 'review', newer.body.includes('"has_any_findings":true') ? 'CHANGES_REQUESTED' : 'INCONCLUSIVE');
    });
  }
  // A newer trusted machine-state attempt is not ignorable just because its
  // framing or version is unsupported: the earlier success is no longer safe.
  for (const body of [
    summary({ has_any_findings: true, has_unresolved_findings: true }).split('\n')[1],
    summary({ has_any_findings: true, has_unresolved_findings: true }).split('\n')[1].replace('codex-review-state:v1', 'codex-review-state:v2'),
    summary().replace('codex-review-state:v1', 'codex-review-state:v2'),
  ]) {
    await t.test(`newer unsupported machine state ${body}`, () => {
      const data = fixture();
      data.snapshot.comments.items = [older, comment({ body })];
      expectStatus(data, 'review', 'INCONCLUSIVE');
    });
  }
});

test('09: explicit per-channel collection errors report unavailable without hiding the other channel', async t => {
  for (const channel of ['comments', 'checks']) {
    await t.test(channel, () => {
      const data = fixture();
      data.snapshot[channel].error = { status: 403, message: 'fixture permission denied' };
      const resultChannel = channel === 'comments' ? 'review' : 'ci';
      const output = expectStatus(data, resultChannel, 'UNAVAILABLE');
      assert.equal(output[resultChannel === 'review' ? 'ci' : 'review'].status, 'PASS');
    });
  }
});

test('10: every independently configured required check must succeed', () => {
  const data = fixture();
  data.policy.required_checks.push({ name: 'unit-tests', app_id: 15368 });
  data.snapshot.checks.items.push(check({ id: 202, name: 'unit-tests' }));
  const output = expectStatus(data, 'ci', 'PASS');
  references(output, 'ci', 201);
  references(output, 'ci', 202);
  data.snapshot.checks.items[1].conclusion = 'failure';
  expectStatus(data, 'ci', 'CHANGES_REQUESTED');
});

test('11: required checks missing, queued, or in progress remain inconclusive', async t => {
  for (const items of [
    [],
    [check({ status: 'queued', conclusion: null, completed_at: null })],
    [check({ status: 'in_progress', conclusion: null, completed_at: null })],
  ]) {
    await t.test(JSON.stringify(items), () => {
      const data = fixture();
      data.snapshot.checks.items = items;
      expectStatus(data, 'ci', 'INCONCLUSIVE');
    });
  }
});

test('12: successful wrong-SHA, wrong-App, or wrong-name checks cannot fill a required slot', async t => {
  for (const candidate of [
    check({ head_sha: OLD_SHA }),
    check({ app: { id: 999 } }),
    check({ name: 'unrelated-check' }),
  ]) {
    await t.test(JSON.stringify(candidate), () => {
      const data = fixture();
      data.snapshot.checks.items = [candidate];
      expectStatus(data, 'ci', 'INCONCLUSIVE');
      data.snapshot.checks.items.push(check());
      expectStatus(data, 'ci', 'PASS');
    });
  }
  // Collection source plus the stable PR capture suffice when this optional
  // GitHub field is absent or empty; explicit contradictions cannot be ignored.
  for (const pullRequests of [undefined, [], [{
    number: 2,
    base: { repo: { id: 10 } },
    head: { repo: { id: 11 }, sha: SHA },
  }]]) {
    await t.test(`consistent optional PR association ${JSON.stringify(pullRequests)}`, () => {
      const data = fixture();
      if (pullRequests !== undefined) data.snapshot.checks.items[0].pull_requests = pullRequests;
      expectStatus(data, 'ci', 'PASS');
    });
  }
  const contradictoryPrs = [
    { number: 3, base: { repo: { id: 10 } }, head: { repo: { id: 11 }, sha: SHA } },
    { number: 2, base: { repo: { id: 999 } }, head: { repo: { id: 11 }, sha: SHA } },
    { number: 2, base: { repo: { id: 10 } }, head: { repo: { id: 999 }, sha: SHA } },
    { number: 2, base: { repo: { id: 10 } }, head: { repo: { id: 11 }, sha: OLD_SHA } },
  ];
  for (const association of contradictoryPrs) {
    await t.test(`contradictory PR association ${JSON.stringify(association)}`, () => {
      const data = fixture();
      data.snapshot.checks.items[0].pull_requests = [association];
      expectStatus(data, 'ci', 'INCONCLUSIVE');
    });
  }
  const correctAssociation = {
    number: 2,
    base: { repo: { id: 10 } },
    head: { repo: { id: 11 }, sha: SHA },
  };
  for (const contradiction of contradictoryPrs.filter(association => association.number === 2)) {
    await t.test(`matching association cannot hide conflicting target ${JSON.stringify(contradiction)}`, () => {
      const data = fixture();
      data.snapshot.checks.items[0].pull_requests = [correctAssociation, contradiction];
      expectStatus(data, 'ci', 'INCONCLUSIVE');
    });
  }
  await t.test('other PR associations may coexist but do not replace the correct target', () => {
    const data = fixture();
    data.snapshot.checks.items[0].pull_requests = [correctAssociation, {
      number: 3,
      base: { repo: { id: 10 } },
      head: { repo: { id: 12 }, sha: OLD_SHA },
    }];
    expectStatus(data, 'ci', 'PASS');
  });
});

test('13: empty required-check policy and non-success terminal conclusions never pass', async t => {
  const empty = fixture();
  empty.policy.required_checks = [];
  expectStatus(empty, 'ci', 'INCONCLUSIVE');
  for (const conclusion of ['neutral', 'skipped', 'cancelled', 'timed_out', 'action_required', 'stale', null, 'unknown']) {
    await t.test(String(conclusion), () => {
      const data = fixture();
      data.snapshot.checks.items[0].conclusion = conclusion;
      expectStatus(data, 'ci', 'INCONCLUSIVE');
    });
  }
});

test('14: latest check rerun controls the result and needs deterministic ordering and completion time', async t => {
  for (const [newer, expected] of [
    [check({ id: 202, started_at: LATER, completed_at: '2026-11-12T02:30:00Z', conclusion: 'failure' }), 'CHANGES_REQUESTED'],
    [check({ id: 202, started_at: LATER, status: 'in_progress', conclusion: null, completed_at: null }), 'INCONCLUSIVE'],
    [check({ id: 202 }), 'INCONCLUSIVE'],
    [check({ id: 202, started_at: 'not-a-date' }), 'INCONCLUSIVE'],
    [check({ id: 202, started_at: LATER, completed_at: null }), 'INCONCLUSIVE'],
  ]) {
    await t.test(JSON.stringify(newer), () => {
      const data = fixture();
      data.snapshot.checks.items.push(newer);
      expectStatus(data, 'ci', expected);
    });
  }
});

test('15: source, capture and pagination inconsistencies invalidate both channels', async t => {
  const mutations = [
    data => { data.snapshot.pr_before.number = 3; },
    data => { data.snapshot.pr_before.base.repo.id = 999; },
    data => { data.snapshot.pr_before.base.repo.full_name = 'other/repository'; },
    data => { data.snapshot.pr_before.head.repo.id = 999; },
    data => { data.snapshot.pr_after.head.sha = OLD_SHA; },
    data => { data.snapshot.pr_before.head.sha = OLD_SHA; data.snapshot.pr_after.head.sha = OLD_SHA; },
    data => { data.snapshot.comments.source.repository_id = 999; },
    data => { data.snapshot.comments.source.pr_number = 3; },
    data => { data.snapshot.checks.source.repository_id = 999; },
    data => { data.snapshot.checks.source.head_sha = OLD_SHA; },
    data => { data.snapshot.comments.complete = false; },
    data => { data.snapshot.checks.complete = false; },
  ];
  for (const [index, mutate] of mutations.entries()) {
    await t.test(`invalid snapshot ${index}`, () => {
      const data = fixture();
      mutate(data);
      const output = evaluate(data);
      assert.equal(output.review.status, 'INCONCLUSIVE');
      assert.equal(output.ci.status, 'INCONCLUSIVE');
    });
  }
});
