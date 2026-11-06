// Cadastro ainda não aprovado não opera: vai direto para a esteira de liberação,
// sem passar pela home. Situação desconhecida segue para a home, onde o servidor
// recusa com 403 quando for o caso.
const EM_LIBERACAO = ["pendente", "em_analise", "reprovado"];

export const rotaDoMotorista = (
  status?: string | null,
): "/liberacao" | "/home" =>
  EM_LIBERACAO.includes(status ?? "") ? "/liberacao" : "/home";
