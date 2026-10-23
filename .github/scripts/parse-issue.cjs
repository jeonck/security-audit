// 이슈 폼 본문(한국어/영어) → 검증된 {repo, ref, plan, lang}. 이슈 본문은 신뢰할 수 없는 입력이므로 이 함수만이 통로다.
const REPO = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/;
const REF = /^[A-Za-z0-9._\/-]{1,100}$/;
const PLANS = ['scan', 'audit', 'retainer'];

const H = {
  ko: { repo: '저장소 주소', ref: '브랜치/태그/커밋 (선택)', plan: '희망 플랜', lang: '리포트 언어', focus: '중점 점검 영역 (선택, Audit 플랜에만 적용)', consent: '확인' },
  en: { repo: 'Repository URL', ref: 'Branch / tag / commit (optional)', plan: 'Plan', lang: 'Report language', focus: 'Focus areas (optional, Audit plan only)', consent: 'Confirmation' },
};
// 중점 점검 영역: 고정 어휘(ID). 폼의 체크박스 라벨과 정확히 일치하는 체크 항목만 ID로 바꾼다. 자유 문장은 어디에도 전달되지 않는다.
const FOCUS = {
  auth: { ko: '인증·권한·세션', en: 'Authentication, authorization, sessions' },
  data: { ko: '데이터 분리·민감 정보', en: 'Data isolation and sensitive data' },
  input: { ko: '외부 입력·API·업로드', en: 'External input, APIs, uploads' },
  infra: { ko: '배포·CI·공급망·AI 기능', en: 'Deployment, CI, supply chain, AI features' },
};
const MSG = {
  ko: {
    repo: '저장소 주소는 https://github.com/<소유자>/<이름> 형식의 github.com 공개 저장소여야 합니다.',
    ref: '브랜치/태그/커밋에는 영문, 숫자, . _ / - 만 쓸 수 있습니다.',
    plan: '희망 플랜은 Scan, Audit, Retainer 중 하나여야 합니다.',
    consent: '소유권 또는 서면 점검 허가 확인에 체크해야 합니다.',
  },
  en: {
    repo: 'The repository URL must be a public github.com repository in the form https://github.com/<owner>/<name>.',
    ref: 'Branch / tag / commit may only contain letters, digits, . _ / and -.',
    plan: 'Plan must be one of Scan, Audit or Retainer.',
    consent: 'You must confirm that you own the code or have written permission to audit it.',
  },
};

const section = (body, title) => {
  const m = body.match(new RegExp(`### ${title.replace(/[()/]/g, '\\$&')}\\s*\\n+([\\s\\S]*?)(?=\\n### |$)`));
  return m ? m[1].trim() : '';
};

function parseIssue(body) {
  const form = body.includes(`### ${H.en.repo}`) ? 'en' : 'ko';
  const h = H[form], t = MSG[form];
  const fail = (error) => ({ ok: false, error, lang: form });

  const m = section(body, h.repo).match(REPO);
  if (!m) return fail(t.repo);

  let ref = section(body, h.ref);
  if (ref === '_No response_') ref = '';
  if (ref && !REF.test(ref)) return fail(t.ref);

  const plan = section(body, h.plan).toLowerCase();
  if (!PLANS.includes(plan)) return fail(t.plan);

  if (!/- \[[xX]\]/.test(section(body, h.consent))) return fail(t.consent);

  // 리포트 언어: 항목이 있으면 그 값, 없으면 폼 언어를 따른다. (한국어 폼의 기존 접수는 ko)
  const l = section(body, h.lang);
  const lang = l ? (/english/i.test(l) ? 'en' : 'ko') : form;
  // 중점 영역은 Audit 플랜에만 적용한다. 다른 플랜에서 선택했으면 무시했음을 알린다.
  const block = section(body, h.focus);
  const chosen = Object.keys(FOCUS).filter((id) => new RegExp(`^- \\[[xX]\\] ${FOCUS[id][form].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm').test(block));
  const focus = plan === 'audit' ? chosen : [];
  const focusIgnored = plan !== 'audit' && chosen.length > 0;
  return { ok: true, value: { repo: `${m[1]}/${m[2]}`, ref, plan, lang, focus, focusIgnored } };
}

module.exports = { parseIssue };

if (require.main === module) {
  const r = parseIssue(process.env.ISSUE_BODY || '');
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
}
