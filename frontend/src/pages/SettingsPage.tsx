import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import type { ShopSetting } from '../types'

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const [settings, setSettings] = useState<ShopSetting | null>(null)
  const [shopName, setShopName] = useState('')
  const [headerText, setHeaderText] = useState('')
  const [logo, setLogo] = useState<File | null>(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    const response = await api.get<ShopSetting>('/shop-settings')
    setSettings(response.data)
    setShopName(response.data.shop_name)
    setHeaderText(response.data.header_text ?? '')
  }

  useEffect(() => {
    load()
  }, [])

  if (user?.role?.slug !== 'owner') {
    return (
      <section>
        <h2>Shop Settings</h2>
        <p className="error">Only owner can manage shop name, logo and header.</p>
      </section>
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const formData = new FormData()
    formData.append('shop_name', shopName)
    formData.append('header_text', headerText)
    if (logo) {
      formData.append('logo', logo)
    }

    await api.post('/shop-settings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    setMessage('Shop settings updated successfully')
    setLogo(null)
    window.dispatchEvent(new Event('shop-settings-updated'))
    load()
  }

  const onLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setLogo(file)
  }

  return (
    <section>
      <h2>Shop Settings</h2>
      <form className="settings-form" onSubmit={onSubmit}>
        <label>
          Shop Name
          <input value={shopName} onChange={(event) => setShopName(event.target.value)} required />
        </label>
        <label>
          Header Text
          <input value={headerText} onChange={(event) => setHeaderText(event.target.value)} />
        </label>
        <label>
          Logo
          <input type="file" accept="image/*" onChange={onLogoChange} />
        </label>

        {settings?.logo_path ? (
          <div className="settings-logo-preview">
            <img src={`/storage/${settings.logo_path}`} alt="Shop logo" />
          </div>
        ) : null}

        <button type="submit">Save Settings</button>
      </form>
      {message ? <p className="pos-message">{message}</p> : null}
    </section>
  )
}
