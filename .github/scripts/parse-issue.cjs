// 이슈 폼 본문 → 검증된 {repo, ref, plan}. 이슈 본문은 신뢰할 수 없는 입력이므로 이 함수만이 통로다.
const REPO = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;
const REF = /^[A-Za-z0-9._\/-]{1,100}$/;
const PLANS = ['scan', 'audit', 'retainer'];

const section = (body, title) => {
  const m = body.match(new RegExp(`### ${title.replace(/[()/]/g, '\\$&')}\\s*\\n+([\\s\\S]*?)(?=\\n### |$)`));
  return m ? m[1].trim() : '';
};
const fail = (error) => ({ ok: false, error });

function parseIssue(body) {
  const m = section(body, '저장소 주소').match(REPO);
  if (!m) return fail('저장소 주소는 https://github.com/<소유자>/<이름> 형식의 github.com 공개 저장소여야 합니다.');

  let ref = section(body, '브랜치/태그/커밋 (선택)');
  if (ref === '_No response_') ref = '';
  if (ref && !REF.test(ref)) return fail('브랜치/태그/커밋에는 영문, 숫자, . _ / - 만 쓸 수 있습니다.');

  const plan = section(body, '희망 플랜').toLowerCase();
  if (!PLANS.includes(plan)) return fail('희망 플랜은 Scan, Audit, Retainer 중 하나여야 합니다.');

  if (!/- \[[xX]\]/.test(section(body, '확인'))) return fail('소유권 또는 서면 점검 허가 확인에 체크해야 합니다.');

  return { ok: true, value: { repo: `${m[1]}/${m[2]}`, ref, plan } };
}

module.exports = { parseIssue };

if (require.main === module) {
  const r = parseIssue(process.env.ISSUE_BODY || '');
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
}
