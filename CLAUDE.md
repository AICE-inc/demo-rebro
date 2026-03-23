# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## セキュリティ（必須）

- 本番環境のクレデンシャルをソースコードに含めない
- 本番DBへの直接操作を行わない
- 外部APIキーをログに出力しない
- セキュリティに関わる作業は .claude/skills/ 配下のスキルを必ず参照すること

<important if="you are reviewing code or creating a PR">
- .claude/skills/security-review.md を参照し、全チェック項目を通過させること
- 秘密情報のハードコードを検知した場合は [CRITICAL] として即時指摘すること
</important>

<important if="you are creating a new repository, initializing a project, or configuring CI/CD">
- .claude/skills/security-setup.md を参照し、GitHub Settings・.gitignore・環境変数設計を確認すること
</important>

<important if="you are implementing API integrations, authentication, or handling secrets, tokens, or credentials">
- .claude/skills/credential-guard.md を参照すること。秘密情報は環境変数またはSecrets Manager経由で注入し、ソースコードに直書きしない
</important>

<important if="you are responding to a security incident, data breach, or credential leak">
- .claude/skills/incident-report.md を参照し、エスカレーション基準に従って報告を促すこと
- 初動対応（キー無効化等）を最優先すること
</important>

<important if="you are adding, updating, or removing dependencies or packages">
- .claude/skills/security-review.md の「依存ライブラリ」セクションを参照し、既知脆弱性と不要な依存を確認すること
</important>

<important if="you are writing documentation, README, proposals, or any content for external sharing">
- .claude/skills/doc-guardrail.md を参照し、個人情報・社内情報・技術情報の漏洩がないか確認すること
</important>
