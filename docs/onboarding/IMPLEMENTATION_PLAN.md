# IMPLEMENTATION PLAN - Onboarding Guiado

1. Criar persistência `UserOnboardingState`.
2. Expor endpoints autenticados `/onboarding`.
3. Calcular checklist inteligente no backend.
4. Criar provider, overlay spotlight, checklist e página Ajuda no frontend.
5. Marcar alvos com `data-onboarding-target`.
6. Validar backend, frontend e responsividade.

Subagentes avaliados:
- `review-agent` retornou riscos e critérios.
- `ux-agent` e `implementation-agent` foram acionados, mas encerrados por timeout antes de retornar.
