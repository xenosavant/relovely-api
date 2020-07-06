export function formatMoney(amount: number) {
  let returnAmount = (amount / 100).toFixed(2);
  return '$' + returnAmount;
}

export function getShippingCost(cost: number): number {
  if (cost < 700) {
    return cost;
  } else if (cost >= 700 && cost < 800) {
    return 750
  } else if (cost >= 800 && cost < 900) {
    return 850;
  } else return 899
}
