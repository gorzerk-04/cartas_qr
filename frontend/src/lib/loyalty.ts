// Mismo texto por defecto (D12) que usa el backend al crear un programa sin consent_text.
export function defaultConsentText(restaurantName: string): string {
  return (
    `Acepto que ${restaurantName} guarde mi nombre y número de celular para registrar mis visitas ` +
    "en su programa de fidelización. Puedo pedir que los borren en cualquier momento."
  ).slice(0, 500);
}

export function rewardPreview(visitsRequired: number, rewardDescription: string): string {
  const reward = rewardDescription.trim() || "tu recompensa";
  return `Acumula ${visitsRequired} visitas y llévate: ${reward}`;
}
