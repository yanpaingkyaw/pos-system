import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'

interface Overview {
  total_products: number
  low_stock_products: number
  total_sales_amount: number
  total_orders_amount: number
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const [overview, setOverview] = useState<Overview | null>(null)

  useEffect(() => {
    api.get('/reports/overview').then((response) => setOverview(response.data))
  }, [])

  return (
    <section>
      <h2>{t('dashboard')}</h2>
      <div className="cards">
        <article className="card"><span>{t('products')}</span><strong>{overview?.total_products ?? '-'}</strong></article>
        <article className="card"><span>{t('lowStock')}</span><strong>{overview?.low_stock_products ?? '-'}</strong></article>
        <article className="card"><span>{t('totalSales')}</span><strong>{overview?.total_sales_amount ?? '-'}</strong></article>
        <article className="card"><span>{t('totalOrders')}</span><strong>{overview?.total_orders_amount ?? '-'}</strong></article>
      </div>
    </section>
  )
}
