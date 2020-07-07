export function formatMoney(amount: number) {
  let returnAmount = (amount / 100).toFixed(2);
  return '$' + returnAmount;
}

export function getShippingCost(weight: number): number {
  if (weight <= 16) {
    return 795;
  } else if (weight <= 32) {
    return 895;
  } else if (weight <= 48) {
    return 895;
  } else if (weight <= 64) {
    return 995;
  } else if (weight <= 80) {
    return 1095;
  } else if (weight <= 96) {
    return 1495;
  } else if (weight <= 112) {
    return 1595;
  } else if (weight <= 128) {
    return 1695;
  } else if (weight <= 144) {
    return 1895;
  } else {
    return 1995;
  }
}
