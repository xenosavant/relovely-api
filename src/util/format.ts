export function formatMoney(amount: number) {
  let returnAmount = (amount / 100).toFixed(2);
  return '$' + returnAmount;
}

export function getShippingCost(weight: number): number {
  if (weight <= 16) {
    return 795;
  } else if (weight <= 32) {
    return 895
  } else if (weight <= 48) {
    return 895;
  } else if (weight <= 64) {
    return 995
  } else return 1095
}
