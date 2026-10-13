// "Av. Rio Madeira, 3288 - Flodoaldo Pontes Pinto, Porto Velho - RO,
// 76820-017, Brasil" vira "Av. Rio Madeira, 3288 - Flodoaldo Pontes Pinto,
// Porto Velho - RO": CEP e país não ajudam o motorista a se orientar.
export const enderecoCurto = (endereco: string) =>
  endereco
    .replace(/,?\s*\d{5}-?\d{3}/g, "")
    .replace(/,?\s*Brasil$/i, "")
    .trim();
