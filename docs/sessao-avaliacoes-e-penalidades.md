# Sessão: nota, faixas e penalidades por nota

Resumo do que foi feito nos quatro repositórios (backend, motorista, passageiro e gestão) e do que ainda falta.

## 1. Taxas de aceitação e finalização

- Cálculo por livro de eventos (`motorista_taxa_eventos`): aceitação no mês corrente; finalização nos últimos 30 dias; conta nova começa em 100%.
- Restrições no ciclo da 99: alerta abaixo do mínimo (70%, com pelo menos 10 corridas), prazo até o dia 14, restrição de 5, 10 e 15 dias, no máximo uma automática por mês.
- Modo sombra (`restricoes_taxa_ativas`, padrão desligado): registra como simulada, sem bloquear nem avisar.
- Telas "Taxa de Finalização" e "Taxa de Aceitação" no app do motorista, abertas pelo menu lateral. O medidor é desenhado só com `View`, porque o Expo Go não tem `react-native-svg`.
- Gestão: exceções, taxas e restrições dos motoristas em `docs/taxas-motoristas.md`.

## 2. Nota de motoristas e passageiros

- Conta nova começa com a nota base **5,0** até a primeira avaliação real.
- A nota é a média das últimas **N** avaliações reais (padrão 200, de 1 a 5000, configurável na gestão). A nota 5 automática, dada quando o passageiro não avalia, não conta.
- Selo **Novo usuário** com menos de 20 corridas finalizadas.
- Perfil do motorista com dados reais: distribuição de estrelas, elogios, notas de agradecimento (paginadas), selos e verificações.
- Menu lateral do motorista mostra a nota com estrela, no lugar do selo "Cadastrar veículo".
- Regras completas em `docs/avaliacoes.md` do projeto da gestão.

## 3. Faixas da nota

| Faixa | Regra (padrão) |
|---|---|
| Excelente | acima de 4,85 |
| Atenção | de 4,51 a 4,85 (os dois limites pertencem a esta faixa) |
| Alto risco / Restrito | abaixo de 4,51 |

Os limites são definidos na gestão (**Configurações → Avaliações**) e a nota é comparada com duas casas. A faixa aparece no perfil do motorista.

## 4. Penalidades por nota

Valem para motorista e passageiro e usam o mesmo desenho das restrições por finalização.

- **Mínimo de avaliações reais** antes de a faixa valer: padrão 10.
- **Atenção:** só aviso educativo, sem prazo e sem penalidade.
- **Alto risco:** alerta com prazo de 7 dias para recuperar. Vencido o prazo e ainda em risco:
  - motorista: restrição de corridas de 5, 10 e 15 dias, depois alterna 10 e 15;
  - passageiro: suspensão de 7 dias e, na 3ª vez, bloqueio permanente (configurável; 0 nunca bloqueia).
- **Bloqueio permanente:** sem data de fim; só a gestão libera.
- **Modo sombra** (`restricoes_nota_ativas`, padrão desligado): tudo é registrado como simulado, sem bloquear nem avisar.
- **Quando reavalia:** a cada avaliação real recebida. A cada 5 minutos o agendador vence prazos e encerra suspensões.
- **Onde bloqueia:** o motorista não fica online nem aceita ou propõe corrida; o passageiro não pede corrida.

Backend: `RestricaoNotaService`, tabelas `alertas_por_nota` e `restricoes_por_nota`, rota `gestao/restricoes-nota`. `situacao_nota` vem no perfil do motorista e no `usuario-logado` do passageiro.

## 5. Portas de desenvolvimento (SDK 58)

| Projeto | Porta |
|---|---|
| Gestão | 8081 |
| Passageiro | 8082 |
| Motorista | 8083 |

`npm run start:go` já usa a porta de cada app. O `.env.local` de cada app define `RCT_METRO_PORT` para o `npx expo start -c` (esse arquivo não vai para o Git). Detalhes em `docs/atualizacao-sdk-58.md`.

## 6. Estado dos testes

- Backend: 460 passam e 3 falham (`CadastroLocalizacaoTest`, por causa do `APP_LOCALE=en` do `.env` local; já falhavam antes).
- App do motorista: `tsc` limpo e lint sem erros; o teste `historicoCorridas` já falhava antes.
- Nada foi aberto em celular ou navegador: a verificação foi só por testes automatizados.

## 7. Pendências

- Tela na gestão para listar alertas e penalidades por nota (hoje só a API).
- Aviso de alerta, suspensão e bloqueio na interface dos dois apps (hoje só notificação e push).
- Decidir o que fazer com o motorista restrito: a nota só muda com corridas, então depois da restrição o ciclo recomeça com um degrau maior. Opções: zerar a janela ao fim da restrição ou limitar os degraus.
- Ligar `restricoes_nota_ativas` só depois de observar o modo sombra.
- Tela do app do passageiro para enviar elogios e perfil do passageiro ainda com dados de exemplo.
- Gestão para "corridas para deixar de ser novo" (hoje vem do `.env` do backend).
- Os testes novos do backend ficam em `tests/`, que está no `.gitignore`: usar `git add -f` ao criar arquivos lá.
- Os 3 `CadastroLocalizacaoTest` falham por causa do `.env` local.
