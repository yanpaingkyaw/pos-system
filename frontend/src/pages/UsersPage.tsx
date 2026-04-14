import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import type { User } from '../types'

export default function UsersPage() {
  const { t } = useTranslation()
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/users')
      .then((res) => setUsers(res.data.data))
      .catch(() => setError('Only owner role can view users'))
  }, [])

  return (
    <section>
      <h2>{t('users')}</h2>
      {error ? <p className="error">{error}</p> : null}
      <table>
        <thead><tr><th>ID</th><th>{t('name')}</th><th>{t('email')}</th><th>Role</th></tr></thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}><td>{user.id}</td><td>{user.name}</td><td>{user.email}</td><td>{user.role?.name}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
