<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { adminApi, type Role, type Permission } from '@/api'

const roles = ref<Role[]>([])
const permissions = ref<Permission[]>([])
const loading = ref(true)
const msg = ref('')
const err = ref('')

// create/edit form
const editing = ref<Role | null>(null)
const form = ref({ name: '', description: '' })
const showForm = ref(false)

// permission editor
const permEditor = ref<Role | null>(null)
const permSelections = ref<string[]>([])

async function load() {
  loading.value = true
  try {
    const [r, p] = await Promise.all([adminApi.roles(), adminApi.permissions()])
    roles.value = r.data.data
    permissions.value = p.data.data
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to load roles.'
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', description: '' }
  showForm.value = true
}

function openEdit(r: Role) {
  editing.value = r
  form.value = { name: r.name, description: r.description || '' }
  showForm.value = true
}

async function saveRole() {
  try {
    if (editing.value) {
      await adminApi.updateRole(editing.value.id, form.value)
      msg.value = 'Role updated.'
    } else {
      await adminApi.createRole(form.value)
      msg.value = 'Role created.'
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to save role.'
  }
}

async function removeRole(r: Role) {
  if (!confirm(`Delete role "${r.name}"?`)) return
  try {
    await adminApi.deleteRole(r.id)
    msg.value = `Role ${r.name} deleted.`
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to delete role.'
  }
}

function openPerms(r: Role) {
  permEditor.value = r
  permSelections.value = [...r.permissions]
}

async function savePerms() {
  if (!permEditor.value) return
  try {
    await adminApi.setRolePermissions(permEditor.value.id, permSelections.value)
    msg.value = `Permissions updated for ${permEditor.value.name}.`
    permEditor.value = null
    await load()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to save permissions.'
  }
}

function togglePerm(name: string) {
  const i = permSelections.value.indexOf(name)
  if (i >= 0) permSelections.value.splice(i, 1)
  else permSelections.value.push(name)
}

const grouped = ref<Record<string, Permission[]>>({})
function groupPerms() {
  const g: Record<string, Permission[]> = {}
  for (const p of permissions.value) {
    const group = p.name.split('.')[0] || 'other'
    ;(g[group] = g[group] || []).push(p)
  }
  grouped.value = g
}

watch(permissions, groupPerms, { immediate: true })
import { watch } from 'vue'

onMounted(load)
</script>

<template>
  <div class="roles">
    <div class="head">
      <h1 class="page-title">Roles & Permissions</h1>
      <button class="btn" @click="openCreate">+ New Role</button>
    </div>

    <p v-if="msg" class="ok">{{ msg }}</p>
    <p v-if="err" class="bad">{{ err }}</p>

    <div v-if="loading" class="loading">Loading…</div>

    <div v-else class="role-list">
      <div v-for="r in roles" :key="r.id" class="role-card">
        <div class="role-main">
          <div class="role-name">
            <strong>{{ r.name }}</strong>
            <span v-if="r.name === 'admin'" class="pill admin">built-in</span>
            <span v-if="r.name === 'user'" class="pill user">built-in</span>
            <span class="perm-count">{{ r.permissions.length }} permissions</span>
          </div>
          <p class="role-desc">{{ r.description || '—' }}</p>
          <div class="perm-tags">
            <span v-for="p in r.permissions.slice(0, 4)" :key="p" class="ptag">{{ p }}</span>
            <span v-if="r.permissions.length > 4" class="ptag more">+{{ r.permissions.length - 4 }} more</span>
          </div>
        </div>
        <div class="role-actions">
          <button class="btn small" @click="openPerms(r)">Edit Permissions</button>
          <button class="btn small outline" @click="openEdit(r)">Rename</button>
          <button
            v-if="r.name !== 'admin' && r.name !== 'user'"
            class="btn small danger"
            @click="removeRole(r)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Create/edit role modal -->
    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false">
      <div class="modal">
        <h3>{{ editing ? 'Edit Role' : 'New Role' }}</h3>
        <div class="form-group">
          <label>Role Name</label>
          <input v-model="form.name" class="form-control" placeholder="e.g. moderator" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <input v-model="form.description" class="form-control" placeholder="What can this role do?" />
        </div>
        <p v-if="err" class="bad">{{ err }}</p>
        <div class="modal-actions">
          <button class="btn small outline" @click="showForm = false">Cancel</button>
          <button class="btn small" @click="saveRole">Save</button>
        </div>
      </div>
    </div>

    <!-- Permission editor modal -->
    <div v-if="permEditor" class="modal-backdrop" @click.self="permEditor = null">
      <div class="modal wide">
        <h3>Permissions for "{{ permEditor.name }}"</h3>
        <div v-for="(perms, group) in grouped" :key="group" class="perm-group">
          <p class="perm-group-label">{{ group }}</p>
          <label v-for="p in perms" :key="p.name" class="perm-check">
            <input type="checkbox" :checked="permSelections.includes(p.name)" @change="togglePerm(p.name)" />
            <span class="perm-name">{{ p.name }}</span>
            <span class="perm-desc">{{ p.description }}</span>
          </label>
        </div>
        <div class="modal-actions">
          <button class="btn small outline" @click="permEditor = null">Cancel</button>
          <button class="btn small" @click="savePerms">Save Permissions</button>
        </div>
      </div>
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

.ok { color: #28a745; margin-bottom: 12px; }
.bad { color: #ff453a; margin-bottom: 12px; }

.role-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.role-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 18px 20px;
}

.role-name {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-name strong {
  font-size: 1.05rem;
  color: #1c1c1c;
}

.perm-count {
  color: #9aa0a6;
  font-size: 0.8rem;
}

.role-desc {
  color: #666;
  font-size: 0.88rem;
  margin: 4px 0 8px;
}

.perm-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ptag {
  background: #f0f0f2;
  color: #555;
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.72rem;
}

.ptag.more {
  background: #eef4ff;
  color: #0a84ff;
}

.role-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.pill {
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 0.7rem;
}

.pill.admin { background: #eef4ff; color: #0a84ff; }
.pill.user { background: #f0f0f2; color: #555; }

/* modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: grid;
  place-items: center;
  z-index: 200;
  padding: 20px;
}

.modal {
  background: #fff;
  border-radius: 14px;
  padding: 26px;
  width: 100%;
  max-width: 420px;
  max-height: 88vh;
  overflow-y: auto;
}

.modal.wide {
  max-width: 640px;
}

.modal h3 {
  margin-bottom: 16px;
  color: #1c1c1c;
}

.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 5px; font-size: 0.85rem; color: #555; }
.form-control {
  width: 100%;
  border: 1px solid #e5e5e7;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 0.92rem;
}

.perm-group { margin-bottom: 14px; }
.perm-group-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #9aa0a6;
  margin-bottom: 6px;
}
.perm-check {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.perm-check:hover { background: #f7f7f9; }
.perm-check input { accent-color: #0a84ff; }
.perm-name { font-size: 0.9rem; color: #333; min-width: 180px; }
.perm-desc { font-size: 0.78rem; color: #9aa0a6; }

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.loading { text-align: center; color: #9aa0a6; padding: 60px; }
</style>
