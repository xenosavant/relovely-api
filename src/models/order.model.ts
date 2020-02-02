import { Entity, model, property } from '@loopback/repository';

@model({ settings: { strict: true } })
export class Order extends Entity {

  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  productId: string;


  @property({
    type: 'date',
    required: true,
  })
  purchaseDate: Date;


  @property({
    type: 'string',
    required: true,
  })
  public shipDate?: Date;


  @property({
    type: 'string',
    required: true,
  })
  public deliveryDate?: Date;


  @property({
    type: 'string',
    required: true,
  })
  public status: 'shipped' | 'unshipped' | 'cancelled' | 'delivered';

  @property({
    type: 'string',
    required: false,
  })
  public trackingNumber?: string;

  @property({
    type: 'string',
    required: false,
  })
  public shippingCarrerName?: string;

  @property({
    type: 'string',
    required: false,
  })
  public shippingCarrierId?: string;

  @property({
    type: 'string',
    required: true,
  })
  public total: number;

  @property({
    type: 'string',
    required: true,
  })
  public shippingCost: number;

  @property({
    type: 'string',
    required: true,
  })
  public tax: number;

}
