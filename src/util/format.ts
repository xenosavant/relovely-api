export function formatMoney(amount: number) {
  let returnAmount = (amount / 100).toFixed(2);
  return '$' + returnAmount;
}
