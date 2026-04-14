import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import type { Category, PaginatedResponse, Product } from '../types'

export default function ProductsPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('0')
  const [quantity, setQuantity] = useState('0')

  const load = async () => {
    const [productRes, categoryRes] = await Promise.all([
      api.get<PaginatedResponse<Product>>('/products'),
      api.get<PaginatedResponse<Category>>('/categories'),
    ])
    setProducts(productRes.data.data)
    setCategories(categoryRes.data.data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await api.post('/products', {
      name,
      category_id: Number(categoryId),
      price: Number(price),
      quantity: Number(quantity),
      min_quantity: 5,
    })
    setName('')
    setPrice('0')
    setQuantity('0')
    load()
  }

  return (
    <section>
      <h2>{t('products')}</h2>
      <form className="inline-form" onSubmit={submit}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('name')} required />
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
          <option value="">Category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name_en}</option>
          ))}
        </select>
        <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="0" step="0.01" placeholder={t('price')} />
        <input value={quantity} onChange={(e) => setQuantity(e.target.value)} type="number" min="0" placeholder={t('quantity')} />
        <button type="submit">{t('save')}</button>
      </form>
      <table>
        <thead><tr><th>SKU</th><th>{t('name')}</th><th>{t('price')}</th><th>{t('quantity')}</th></tr></thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.sku}</td>
              <td>{product.name}</td>
              <td>{product.price}</td>
              <td>{product.quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
