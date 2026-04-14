import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { useAuthStore } from '../store/authStore'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import type { ShopSetting } from '../types'

export default function AppLayout() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [settings, setSettings] = useState<ShopSetting | null>(null)

  const loadShopSettings = async () => {
    try {
      const response = await api.get<ShopSetting>('/shop-settings')
      setSettings(response.data)
    } catch {
      setSettings(null)
    }
  }

  useEffect(() => {
    loadShopSettings()

    const onUpdate = () => {
      loadShopSettings()
    }

    window.addEventListener('shop-settings-updated', onUpdate)
    return () => window.removeEventListener('shop-settings-updated', onUpdate)
  }, [])

  const onLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {settings?.logo_path ? (
            <img src={`/storage/${settings.logo_path}`} alt="Shop logo" className="sidebar-logo" />
          ) : null}
          <h1>{settings?.shop_name || t('appName')}</h1>
        </div>
        <nav>
          <NavLink to="/">{t('dashboard')}</NavLink>
          <NavLink to="/products">{t('products')}</NavLink>
          <NavLink to="/categories">{t('categories')}</NavLink>
          <NavLink to="/sales">{t('sales')}</NavLink>
          <NavLink to="/orders">{t('orders')}</NavLink>
          <NavLink to="/users">{t('users')}</NavLink>
          <NavLink to="/reports">{t('reports')}</NavLink>
          <NavLink to="/settings">Shop Settings</NavLink>
        </nav>
      </aside>
      <main className="content">
        <header className="topbar">
          <div>
            <p>{user?.name}</p>
            <small>{user?.role?.name}</small>
          </div>
          <div className="topbar-actions">
            <LanguageSwitcher />
            <button type="button" onClick={onLogout}>
              {t('logout')}
            </button>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  )
}
