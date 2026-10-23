# security-audit
https://security-audit.metacog.co.kr — 코드 보안 점검 서비스 사이트.

- `index.html` 랜딩 (Pages 자동 배포), `.github/ISSUE_TEMPLATE/audit-request.yml` 문의 폼
- `.github/workflows/audit.yml` 운영자용 감사 실행 (Actions → Run audit). 필요한 시크릿: `CLAUDE_CODE_OAUTH_TOKEN`, 비공개 대상용 `AUDIT_TARGET_TOKEN`(읽기 PAT)
- `skill/` Cloudflare security-audit-skill (MIT) 사본
