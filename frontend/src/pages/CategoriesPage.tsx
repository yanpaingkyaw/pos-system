import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import type { Category, PaginatedResponse } from '../types'

export default function CategoriesPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Category[]>([])
  const [nameEn, setNameEn] = useState('')
  const [nameMy, setNameMy] = useState('')

  const load = async () => {
    const response = await api.get<PaginatedResponse<Category>>('/categories')
    setItems(response.data.data)
  }

  useEffect(() => {
    load()
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    await api.post('/categories', { name_en: nameEn, name_my: nameMy })
    setNameEn('')
    setNameMy('')
    load()
  }

  return (
    <section>
      <h2>{t('categories')}</h2>
      <form onSubmit={submit} className="inline-form">
        <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="Name (EN)" required />
        <input value={nameMy} onChange={(e) => setNameMy(e.target.value)} placeholder="Name (MY)" required />
        <button type="submit">{t('save')}</button>
      </form>
      <table>
        <thead><tr><th>ID</th><th>EN</th><th>MY</th></tr></thead>
        <tbody>
          {items.map((category) => (
            <tr key={category.id}><td>{category.id}</td><td>{category.name_en}</td><td>{category.name_my}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
