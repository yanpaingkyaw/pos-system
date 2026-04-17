import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import type { ShopSetting } from '../types'

const PAYMENT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'cash', label: 'Cash' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card', label: 'Card' },
]

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user)
  const [settings, setSettings] = useState<ShopSetting | null>(null)
  const [shopName, setShopName] = useState('')
  const [headerText, setHeaderText] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['cash', 'wallet'])
  const [walletProvidersText, setWalletProvidersText] = useState('KBZPay, WavePay, AYA Pay, CB Pay')
  const [logo, setLogo] = useState<File | null>(null)
  const [message, setMessage] = useState('')

  const load = async () => {
    const response = await api.get<ShopSetting>('/shop-settings')
    setSettings(response.data)
    setShopName(response.data.shop_name)
    setHeaderText(response.data.header_text ?? '')
    setPaymentMethods(response.data.payment_methods?.length ? response.data.payment_methods : ['cash', 'wallet'])
    setWalletProvidersText((response.data.wallet_providers?.length ? response.data.wallet_providers : ['KBZPay', 'WavePay', 'AYA Pay', 'CB Pay']).join(', '))
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
    const walletProviders = walletProvidersText
      .split(',')
      .map((provider) => provider.trim())
      .filter(Boolean)

    const formData = new FormData()
    formData.append('shop_name', shopName)
    formData.append('header_text', headerText)
    formData.append('payment_methods', JSON.stringify(paymentMethods))
    formData.append('wallet_providers', JSON.stringify(walletProviders))
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

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods((current) => {
      if (current.includes(method)) {
        return current.filter((entry) => entry !== method)
      }

      return [...current, method]
    })
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

        <fieldset className="settings-options">
          <legend>Payment Methods (Myanmar context)</legend>
          <div className="settings-checkboxes">
            {PAYMENT_OPTIONS.map((option) => (
              <label key={option.value} className="settings-check-item">
                <input
                  type="checkbox"
                  checked={paymentMethods.includes(option.value)}
                  onChange={() => togglePaymentMethod(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label>
          Wallet Providers (comma separated)
          <textarea
            value={walletProvidersText}
            onChange={(event) => setWalletProvidersText(event.target.value)}
            rows={3}
            placeholder="KBZPay, WavePay, AYA Pay, CB Pay"
            disabled={!paymentMethods.includes('wallet')}
          />
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
