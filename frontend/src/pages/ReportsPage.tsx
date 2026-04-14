import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'

type SalesReport = {
  total_amount: number
  total_count: number
}

type OrdersReport = {
  total_orders: number
  total_amount: number
}

export default function ReportsPage() {
  const { t } = useTranslation()
  const [sales, setSales] = useState<SalesReport | null>(null)
  const [orders, setOrders] = useState<OrdersReport | null>(null)

  useEffect(() => {
    Promise.all([api.get('/reports/sales'), api.get('/reports/orders')]).then(([salesRes, ordersRes]) => {
      setSales(salesRes.data)
      setOrders(ordersRes.data)
    })
  }, [])

  return (
    <section>
      <h2>{t('reports')}</h2>
      <div className="cards">
        <article className="card"><span>{t('totalSales')}</span><strong>{sales?.total_amount ?? '-'}</strong></article>
        <article className="card"><span>Sales Count</span><strong>{sales?.total_count ?? '-'}</strong></article>
        <article className="card"><span>{t('totalOrders')}</span><strong>{orders?.total_amount ?? '-'}</strong></article>
        <article className="card"><span>Order Count</span><strong>{orders?.total_orders ?? '-'}</strong></article>
      </div>
    </section>
  )
}
