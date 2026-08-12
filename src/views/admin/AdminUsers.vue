<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type AdminUser, type Role } from '@/api'

const users = ref<AdminUser[]>([])
const roles = ref<Role[]>([])
const meta = ref({ page: 1, pages: 1, total_count: 0, has_next: false, has_prev: false })
const page = ref(1)
const search = ref('')
const loading = ref(true)
const msg = ref('')
const err = ref('')

async function load() {
  loading.value = true
  try {
    const r = await adminApi.users({ page: page.value, per_page: 15, search: search.value || undefined })
    users.value = r.data.data
    meta.value = r.data.meta
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load users.'
  } finally {
    loading.value = false
  }
}

async function loadRoles() {
  try {
    const r = await adminApi.roles()
    roles.value = r.data.data
  } catch {
    roles.value = []
  }
}

async function setRole(u: AdminUser, roleName: string) {
  if (!roleName) return
  try {
    await adminApi.setRole(u.id, roleName)
    msg.value = `${u.full_name} now has role "${roleName}".`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to change role.'
  }
}

async function removeUser(u: AdminUser) {
  if (!confirm(`Delete user ${u.full_name} (${u.email})? This removes their listings too.`)) return
  try {
    await adminApi.deleteUser(u.id)
    msg.value = `User ${u.full_name} deleted.`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete user.'
  }
}

async function toggleVerify(u: AdminUser) {
  const next = !u.email_verified
  try {
    await adminApi.verifyUser(u.id, next)
    msg.value = `${u.full_name} ${next ? 'verified' : 'unverified'}.`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update verification.'
  }
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(() => {
  load()
  loadRoles()
})
</script>

<template>
  <div class="users">
    <div class="head">
      <h1 class="page-title">Users</h1>
      <div class="search">
        <input v-model="search" type="text" placeholder="Search users…" @keyup.enter="page = 1; load()" />
        <button class="btn" @click="page = 1; load()">Search</button>
      </div>
    </div>

    <p v-if="msg" class="ok">{{ msg }}</p>
    <p v-if="err" class="bad">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>User</th>
          <th>Email</th>
          <th>Verified</th>
          <th>Role</th>
          <th>Joined</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td data-label="User">
            <div class="user-cell">
              <div class="u-avatar">{{ u.full_name?.[0]?.toUpperCase() }}</div>
              <div>
                <strong>{{ u.full_name }}</strong>
                <span class="u-name">@{{ u.username }}</span>
              </div>
            </div>
          </td>
          <td data-label="Email">{{ u.email }}</td>
          <td data-label="Verified">
            <span class="pill" :class="u.email_verified ? 'ok' : 'no'">
              {{ u.email_verified ? 'Verified' : 'Unverified' }}
            </span>
          </td>
          <td data-label="Role">
            <select
              class="role-select"
              :value="u.role"
              @change="setRole(u, ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="r in roles" :key="r.id" :value="r.name">{{ r.name }}</option>
            </select>
          </td>
          <td data-label="Joined">{{ fmtDate(u.created_at) }}</td>
          <td class="actions" data-label="Actions">
            <button v-if="!u.email_verified" class="btn small" @click="toggleVerify(u)">Verify</button>
            <button v-else class="btn small outline" @click="toggleVerify(u)">Unverify</button>
            <button class="btn small danger" @click="removeUser(u)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="meta.pages > 1" class="pagination">
      <button class="btn small" :disabled="!meta.has_prev" @click="page--; load()">Prev</button>
      <span>{{ meta.page }} / {{ meta.pages }}</span>
      <button class="btn small" :disabled="!meta.has_next" @click="page++; load()">Next</button>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 20px;
}

.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
  flex-wrap: wrap;
}

.search {
  display: flex;
  gap: 8px;
}

.search input {
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 0.9rem;
  min-width: 220px;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 9px 16px;
  background: #0a84ff;
  color: #fff;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
}

.btn.small {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.btn.outline {
  background: #fff;
  color: #0a84ff;
  border: 1.5px solid #0a84ff;
}

.btn.danger {
  background: #ff453a;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ok {
  color: #28a745;
  margin-bottom: 12px;
}

.bad {
  color: #ff453a;
  margin-bottom: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  overflow: hidden;
  font-size: 0.9rem;
}

.table th {
  text-align: left;
  padding: 12px 16px;
  background: #f9f9fa;
  color: #666;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table td {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f2;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.u-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #0a84ff;
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 600;
}

.u-name {
  display: block;
  color: #9aa0a6;
  font-size: 0.8rem;
}

.pill {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
}

.pill.ok {
  background: #e6f7ec;
  color: #1a7f37;
}

.pill.no {
  background: #ffeceb;
  color: #d0342c;
}

.pill.admin {
  background: #eef4ff;
  color: #0a84ff;
}

.pill.user {
  background: #f0f0f2;
  color: #555;
}

.role-select {
  border: 1.5px solid #e5e5e7;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 0.85rem;
  background: #fff;
  color: #333;
  cursor: pointer;
}

.role-select:focus {
  outline: none;
  border-color: #0a84ff;
}

.actions {
  display: flex;
  gap: 6px;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  color: #666;
}

.loading {
  text-align: center;
  color: #9aa0a6;
  padding: 60px;
}
</style>
