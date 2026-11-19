// "Av. Rio Madeira, 3288 - Flodoaldo Pontes Pinto, Porto Velho - RO,
// 76820-017, Brasil" vira "Av. Rio Madeira, 3288 - Flodoaldo Pontes Pinto,
// Porto Velho - RO": CEP e país não ajudam o motorista a se orientar.
export const enderecoCurto = (endereco: string) =>
  endereco
    .replace(/,?\s*\d{5}-?\d{3}/g, "")
    .replace(/,?\s*Brasil$/i, "")
    .trim();

// Para quem já está na cidade: "Av. Rio Madeira, 3288 - Flodoaldo Pontes
// Pinto, Porto Velho - RO" vira "Av. Rio Madeira, 3288 - Flodoaldo Pontes
// Pinto" (rua, número se houver e bairro).
export const enderecoSemCidade = (endereco: string) =>
  enderecoCurto(endereco)
    .replace(/,\s*[^,]+\s-\s[A-Za-z]{2}$/, "")
    .trim();

// Separa a rua do número para o cartão de embarque: "Av. Rio Madeira, 3288 -
// Flodoaldo Pontes Pinto" dá { rua: "Av. Rio Madeira", numero: "3288" }. Sem
// número (ou "s/n"), o número volta como "S/N".
export const ruaENumero = (endereco: string) => {
  const principal = enderecoSemCidade(endereco).split(" - ")[0].trim();
  const virgula = principal.lastIndexOf(",");
  const final = virgula >= 0 ? principal.slice(virgula + 1).trim() : "";

  if (virgula >= 0 && /^(\d+[A-Za-z]?|s\/?n)$/i.test(final)) {
    const numero = /^s\/?n$/i.test(final) ? "S/N" : final;
    return { rua: principal.slice(0, virgula).trim(), numero };
  }

  return { rua: principal, numero: "S/N" };
};
