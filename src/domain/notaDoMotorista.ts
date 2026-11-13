// Nota que os passageiros deram ao motorista, no menu lateral ("4,92").
// Quem ainda não foi avaliado não tem média: mostrar 0,00 pareceria nota ruim.
export function textoDaNotaDoMotorista(nota: number | null | undefined) {
  return typeof nota === "number"
    ? nota.toFixed(2).replace(".", ",")
    : "Sem avaliações";
}
