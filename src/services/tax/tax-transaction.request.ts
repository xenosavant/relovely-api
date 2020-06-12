export interface TaxTranactionRequest {
  transaction_id: string,
  transaction_date: Date,
  to_country: string,
  to_zip: string,
  to_state: string,
  to_city: string,
  to_street: string,
  amount: number,
  shipping: number,
  sales_tax: number,
  line_items: [
    {
      quantity: 1,
      product_identifier: string,
      description: string,
      unit_price: number,
      sales_tax: number
    }
  ]
}
