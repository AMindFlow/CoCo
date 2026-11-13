import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const integer = value => Number.isSafeInteger(value) && value > 0;
const sha = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const timestamp = value => typeof value === 'string' && /T.*(?:Z|[+-]\d\d:\d\d)$/.test(value)
  && Number.isFinite(Date.parse(value));
const result = (status, reason, ids = []) => ({ status, reasons: [reason], evidence_ids: ids });

function captureProblem(snapshot, policy) {
  if (!integer(policy?.repository_id) || !integer(policy?.pr_number) || !integer(policy?.head_repository_id)
      || !sha(policy?.head_sha) || !/^[\w.-]+\/[\w.-]+$/.test(policy?.repository_full_name ?? '')) return 'INVALID_TARGET_POLICY';
  if (!timestamp(snapshot?.captured_at)) return 'INVALID_CAPTURE_TIME';
  for (const pr of [snapshot.pr_before, snapshot.pr_after]) {
    if (pr?.number !== policy.pr_number || pr?.base?.repo?.id !== policy.repository_id
        || pr?.base?.repo?.full_name !== policy.repository_full_name
        || pr?.head?.repo?.id !== policy.head_repository_id || pr?.head?.sha !== policy.head_sha) {
      return 'PR_CAPTURE_IDENTITY_OR_HEAD_CHANGED';
    }
  }
  if (snapshot.comments?.source?.repository_id !== policy.repository_id
      || snapshot.comments?.source?.pr_number !== policy.pr_number
      || snapshot.checks?.source?.repository_id !== policy.repository_id
      || snapshot.checks?.source?.head_sha !== policy.head_sha) return 'COLLECTION_SOURCE_MISMATCH';
  for (const channel of [snapshot.comments, snapshot.checks]) {
    if (!channel.error && (channel.complete !== true || !Array.isArray(channel.items))) return 'COLLECTION_INCOMPLETE';
  }
  return null;
}

function latest(items, field, capturedAt) {
  if (items.some(item => !integer(item?.id) || !timestamp(item?.[field])
      || Date.parse(item[field]) > Date.parse(capturedAt))) return null;
  const sorted = [...items].sort((a, b) => Date.parse(b[field]) - Date.parse(a[field]));
  if (sorted.length > 1 && Date.parse(sorted[0][field]) === Date.parse(sorted[1][field])) return null;
  return sorted[0];
}

function commentBelongsToPR(comment, policy) {
  try {
    const url = new URL(comment.html_url);
    return url.protocol === 'https:' && url.hostname === 'github.com' && url.port === ''
      && url.username === '' && url.password === '' && url.search === ''
      && ['pull', 'issues'].some(kind => url.pathname === `/${policy.repository_full_name}/${kind}/${policy.pr_number}`)
      && url.hash === `#issuecomment-${comment.id}`;
  } catch { return false; }
}

function reviewResult(snapshot, policy) {
  const channel = snapshot.comments;
  if (channel.error) return result('UNAVAILABLE', 'REVIEW_READ_FAILED');
  const reviewer = policy.reviewer;
  if (!integer(reviewer?.id) || typeof reviewer?.login !== 'string' || reviewer?.type !== 'Bot') {
    return result('INCONCLUSIVE', 'REVIEWER_POLICY_INVALID');
  }
  const candidates = channel.items.filter(comment => comment?.user?.id === reviewer.id
    && comment?.user?.login === reviewer.login && comment?.user?.type === reviewer.type
    && typeof comment.body === 'string' && (comment.body.includes('codex-pull-request-review-summary')
      || comment.body.includes('codex-review-state:')));
  if (!candidates.length) return result('INCONCLUSIVE', 'REVIEW_COMPLETION_MISSING');
  const comment = latest(candidates, 'updated_at', snapshot.captured_at);
  if (!comment) return result('INCONCLUSIVE', 'REVIEW_ORDER_AMBIGUOUS');
  const ids = [comment.id];
  if (!commentBelongsToPR(comment, policy)) return result('INCONCLUSIVE', 'REVIEW_RESOURCE_MISMATCH', ids);
  const lines = comment.body.split(/\r?\n/);
  const markers = lines.filter(line => /^<!-- codex-review-state:/.test(line));
  if (lines[0] !== '<!-- codex-pull-request-review-summary -->' || markers[0] !== lines[1]
      || lines.filter(line => line === '<!-- codex-pull-request-review-summary -->').length !== 1
      || markers.length !== 1) return result('INCONCLUSIVE', 'REVIEW_FORMAT_UNKNOWN', ids);
  const match = /^<!-- codex-review-state:v1 (.+) -->$/.exec(markers[0]);
  let state;
  try { state = match && JSON.parse(match[1])?.code_review; } catch { /* Unsupported data cannot pass. */ }
  if (!state || !sha(state.commit_sha) || typeof state.has_any_findings !== 'boolean'
      || typeof state.has_unresolved_findings !== 'boolean') return result('INCONCLUSIVE', 'REVIEW_FIELDS_INVALID', ids);
  if (state.commit_sha !== policy.head_sha) {
    return { ...result('INCONCLUSIVE', 'REVIEW_SHA_STALE', ids), observed_sha: state.commit_sha };
  }
  if (state.status !== 'completed') return result('INCONCLUSIVE', 'REVIEW_NOT_COMPLETED', ids);
  if (state.has_any_findings === false && state.has_unresolved_findings === false) {
    return result('PASS', 'CURRENT_SHA_COMPLETED_NO_FINDINGS', ids);
  }
  if (state.has_any_findings === true && state.has_unresolved_findings === true) {
    return result('CHANGES_REQUESTED', 'CURRENT_SHA_UNRESOLVED_FINDINGS', ids);
  }
  return result('INCONCLUSIVE', 'REVIEW_FLAGS_AMBIGUOUS', ids);
}

function checkPRIsConsistent(check, policy) {
  if (check.pull_requests === undefined) return true;
  if (!Array.isArray(check.pull_requests)) return false;
  if (!check.pull_requests.length) return true;
  const related = check.pull_requests.filter(pr => pr?.number === policy.pr_number);
  return related.length > 0 && related.every(pr => pr?.base?.repo?.id === policy.repository_id
    && pr?.head?.sha === policy.head_sha
    && (pr?.head?.repo === undefined || pr.head.repo.id === policy.head_repository_id));
}

function ciResult(snapshot, policy) {
  if (snapshot.checks.error) return result('UNAVAILABLE', 'CHECKS_READ_FAILED');
  const required = policy.required_checks;
  if (!Array.isArray(required) || !required.length
      || required.some(item => typeof item?.name !== 'string' || !item.name || !integer(item.app_id))
      || new Set(required.map(item => `${item.name}:${item.app_id}`)).size !== required.length) {
    return result('INCONCLUSIVE', 'REQUIRED_CHECK_POLICY_UNKNOWN');
  }
  const details = required.map(requirement => {
    const candidates = snapshot.checks.items.filter(check => check?.name === requirement.name
      && check?.app?.id === requirement.app_id && check?.head_sha === policy.head_sha);
    if (!candidates.length) return { name: requirement.name, ...result('INCONCLUSIVE', 'REQUIRED_CHECK_MISSING') };
    const check = latest(candidates, 'started_at', snapshot.captured_at);
    if (!check) return { name: requirement.name, ...result('INCONCLUSIVE', 'CHECK_ORDER_AMBIGUOUS') };
    const ids = [check.id];
    let outcome;
    if (!checkPRIsConsistent(check, policy)) outcome = result('INCONCLUSIVE', 'CHECK_PR_MISMATCH', ids);
    else if (check.status !== 'completed') outcome = result('INCONCLUSIVE', 'CHECK_NOT_COMPLETED', ids);
    else if (!timestamp(check.completed_at) || Date.parse(check.completed_at) < Date.parse(check.started_at)
        || Date.parse(check.completed_at) > Date.parse(snapshot.captured_at)) {
      outcome = result('INCONCLUSIVE', 'CHECK_COMPLETION_TIME_INVALID', ids);
    } else if (check.conclusion === 'success') outcome = result('PASS', 'CURRENT_SHA_CHECK_SUCCESS', ids);
    else if (check.conclusion === 'failure') outcome = result('CHANGES_REQUESTED', 'CURRENT_SHA_CHECK_FAILURE', ids);
    else outcome = result('INCONCLUSIVE', 'CHECK_CONCLUSION_NOT_SUCCESS', ids);
    return { name: requirement.name, ...outcome };
  });
  const status = details.some(item => item.status === 'CHANGES_REQUESTED') ? 'CHANGES_REQUESTED'
    : details.every(item => item.status === 'PASS') ? 'PASS' : 'INCONCLUSIVE';
  return { status, reasons: details.map(item => `${item.name}:${item.reasons[0]}`),
    evidence_ids: details.flatMap(item => item.evidence_ids), checks: details };
}

/** Classifies an offline observation only. It is never an execution/merge authorization. */
export function evaluateSnapshot(snapshot, policy) {
  const problem = captureProblem(snapshot, policy);
  return {
    contractVersion: 'T007-readonly-v1',
    target: { repository_id: policy?.repository_id, pr_number: policy?.pr_number, head_sha: policy?.head_sha },
    captured_at: snapshot?.captured_at,
    review: problem ? result('INCONCLUSIVE', problem) : reviewResult(snapshot, policy),
    ci: problem ? result('INCONCLUSIVE', problem) : ciResult(snapshot, policy),
    merge_authorized: false,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('ARGUMENTS');
    const bundle = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    process.stdout.write(`${JSON.stringify(evaluateSnapshot(bundle.snapshot, bundle.policy), null, 2)}\n`);
  } catch {
    process.stderr.write('EVIDENCE_INPUT_INVALID\n');
    process.exitCode = 1;
  }
}
