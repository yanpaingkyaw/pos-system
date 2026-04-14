import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'

type Order = {
  id: number
  order_number: string
  customer_name: string
  total: string
  status: string
}

type ProductOption = {
  id: number
  name: string
}

export default function OrdersPage() {
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('1')

  const load = async () => {
    const [orderRes, productRes] = await Promise.all([
      api.get('/orders'),
      api.get('/products'),
    ])
    setOrders(orderRes.data.data)
    setProducts(productRes.data.data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await api.post('/orders', {
      customer_name: customerName,
      customer_phone: customerPhone,
      items: [{ product_id: Number(productId), quantity: Number(quantity) }],
    })
    setCustomerName('')
    setCustomerPhone('')
    load()
  }

  return (
    <section>
      <h2>{t('orders')}</h2>
      <form className="inline-form" onSubmit={submit}>
        <input placeholder="Customer" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <input placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
        <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">{t('products')}</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <button type="submit">{t('save')}</button>
      </form>
      <table>
        <thead><tr><th>#</th><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}><td>{order.id}</td><td>{order.order_number}</td><td>{order.customer_name}</td><td>{order.total}</td><td>{order.status}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
