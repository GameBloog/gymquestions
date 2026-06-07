# Governanca LGPD - G-Force

Este documento e operacional e deve ser revisado por advogado antes de uso publico ou contratual.

## Inventario de tratamentos

- Conta e cadastro: nome, e-mail, senha com hash, papel e telefone opcional. Finalidade: operar conta e controlar acesso. Base legal: execucao de contrato e seguranca.
- Acompanhamento: treino, dieta, historico, medidas, fotos corporais e PDFs. Finalidade: prestar acompanhamento personalizado. Base legal: execucao de contrato e tutela da saude quando aplicavel.
- Financeiro: renovacoes, lancamentos e relatorios. Finalidade: gestao contratual e obrigacoes legais.
- Sessoes e seguranca: refresh sessions, auditoria, IP/UA pseudonimizados quando aplicavel. Finalidade: seguranca e prevencao a abuso.
- Leads e analytics: fingerprint, referrer e UTMs. Finalidade: mensurar aquisicao. Base legal: consentimento opcional.
- Comunicacoes: e-mail e WhatsApp operacionais ou promocionais. Operacional: execucao do servico. Promocional: consentimento.

## Retencao e descarte

- Sessoes expiradas ou revogadas: limpar periodicamente apos 90 dias.
- Eventos de lead: reter por ate 180 dias e descartar/anomizar depois.
- Fotos e arquivos: remover quando o titular solicitar exclusao e nao houver obrigacao legal conflitante.
- Auditoria e registros legais: preservar enquanto necessario para exercicio regular de direitos e obrigacoes legais.
- Dados financeiros: preservar conforme obrigacoes fiscais/contabeis aplicaveis.

## Operadores e transferencias

- Cloudinary: armazenamento e entrega privada de imagens/PDFs, com possivel transferencia internacional.
- Twilio: envio de WhatsApp, quando configurado.
- SMTP/Nodemailer: envio de e-mails, conforme provedor configurado.

Contratos, DPAs, SCCs, medidas tecnicas e suboperadores devem ser verificados fora do codigo antes da operacao em producao.

## Direitos do titular

- O titular pode solicitar exportacao, exclusao, correcao, informacoes e revogacao de consentimentos pela area de privacidade ou pelo contato configurado.
- Solicitações devem ser registradas em `data_subject_requests`.
- Acoes relevantes devem gerar `privacy_audit_events`.
- Exclusao deve revogar sessoes, bloquear login, remover objetos externos quando possivel e registrar falhas.

## Incidentes

- Registrar data, descricao, sistemas afetados, dados envolvidos, titulares impactados, evidencias, contencao, responsaveis e decisao de comunicacao.
- Incidentes com risco ou dano relevante devem seguir o prazo regulatorio de tres dias uteis indicado pela ANPD.
- Evidencias tecnicas devem ser preservadas sem expor dados pessoais alem do necessario.

## Revisao administrativa

- Revisar acessos administrativos periodicamente.
- Registrar concessao, alteracao e remocao de perfis administrativos.
- MFA administrativo permanece como proxima etapa funcional.
