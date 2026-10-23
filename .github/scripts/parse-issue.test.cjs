const test = require('node:test');
const assert = require('node:assert');
const { parseIssue } = require('./parse-issue.cjs');

const body = (o = {}) => `### 저장소 주소

${o.repo ?? 'https://github.com/octo/hello'}

### 브랜치/태그/커밋 (선택)

${o.ref ?? '_No response_'}

### 희망 플랜

${o.plan ?? 'Scan'}

### 확인

- [${o.consent ?? 'x'}] 점검 대상 코드에 대한 소유권 또는 서면 점검 허가가 있습니다.
`;

test('정상 접수는 owner/name, 빈 ref, 소문자 plan으로 변환된다', () => {
  const r = parseIssue(body());
  assert.deepStrictEqual(r, { ok: true, value: { repo: 'octo/hello', ref: '', plan: 'scan', lang: 'ko' } });
});

test('ref가 있으면 그대로 전달된다', () => {
  const r = parseIssue(body({ ref: 'release/1.2' }));
  assert.strictEqual(r.value.ref, 'release/1.2');
});

test('끝의 .git 과 슬래시는 제거된다', () => {
  const r = parseIssue(body({ repo: 'https://github.com/octo/hello.git/' }));
  assert.strictEqual(r.value.repo, 'octo/hello');
});

test('github.com 이 아닌 주소는 한국어 사유와 함께 거부된다', () => {
  const r = parseIssue(body({ repo: 'https://gitlab.com/octo/hello' }));
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /github\.com/);
});

test('소유권 확인 체크가 없으면 거부된다', () => {
  const r = parseIssue(body({ consent: ' ' }));
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /소유권|허가/);
});

test('ref 의 셸 특수문자는 거부된다', () => {
  for (const ref of ['main; rm -rf /', '$(id)', 'a`b`', 'x && y', 'a b']) {
    assert.strictEqual(parseIssue(body({ ref })).ok, false, ref);
  }
});

test('알 수 없는 플랜은 거부된다', () => {
  assert.strictEqual(parseIssue(body({ plan: 'Free' })).ok, false);
});

test('저장소 주소 항목이 없으면 거부된다', () => {
  assert.strictEqual(parseIssue('### 희망 플랜\n\nScan\n').ok, false);
});

const bodyEn = (o = {}) => `### Repository URL

${o.repo ?? 'https://github.com/octo/hello'}

### Branch / tag / commit (optional)

${o.ref ?? '_No response_'}

### Plan

${o.plan ?? 'Scan'}

### Report language

${o.lang ?? 'English'}

### Confirmation

- [${o.consent ?? 'x'}] I own this code or have written permission to audit it.
`;
const KOREAN = /[가-힣]/;

test('영어 폼은 읽히고 리포트 언어 en 을 돌려준다', () => {
  assert.deepStrictEqual(parseIssue(bodyEn()), { ok: true, value: { repo: 'octo/hello', ref: '', plan: 'scan', lang: 'en' } });
});

test('영어 폼에서 리포트 언어를 한국어로 고르면 ko', () => {
  assert.strictEqual(parseIssue(bodyEn({ lang: 'Korean (한국어)' })).value.lang, 'ko');
});

test('한국어 폼의 리포트 언어 항목이 English 면 en', () => {
  const b = body().replace('### 확인', '### 리포트 언어\n\nEnglish\n\n### 확인');
  assert.strictEqual(parseIssue(b).value.lang, 'en');
});

test('영어 폼의 오류 메시지는 영어다', () => {
  for (const bad of [bodyEn({ repo: 'https://gitlab.com/x/y' }), bodyEn({ consent: ' ' }), bodyEn({ plan: 'Free' }), bodyEn({ ref: 'a; b' })]) {
    const r = parseIssue(bad);
    assert.strictEqual(r.ok, false);
    assert.ok(!KOREAN.test(r.error), r.error);
  }
});

test('영어 폼의 오류에는 언어 정보가 담긴다', () => {
  assert.strictEqual(parseIssue(bodyEn({ plan: 'Free' })).lang, 'en');
  assert.strictEqual(parseIssue(body({ plan: 'Free' })).lang, 'ko');
});
