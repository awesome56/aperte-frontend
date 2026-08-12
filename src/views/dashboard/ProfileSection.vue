<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { userApi } from '@/api'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

const profileForm = reactive({ full_name: '', phone_number: '' })
const dpFile = ref<File | null>(null)
const dpPreview = ref('')
const msg = ref('')
const err = ref('')

const pwForm = reactive({ old_password: '', new_password: '', comfirm_password: '' })
const pwMsg = ref('')
const pwErr = ref('')
const pwLoading = ref(false)

const avatar = computed(() => dpPreview.value || auth.user?.profile_picture || '')

function onDp(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  dpFile.value = file
  dpPreview.value = URL.createObjectURL(file)
}

async function saveProfile() {
  msg.value = ''
  err.value = ''
  try {
    await userApi.update({
      full_name: profileForm.full_name,
      phone_number: profileForm.phone_number ? Number(profileForm.phone_number) : null,
    })
    if (dpFile.value) await userApi.uploadDp(dpFile.value)
    msg.value = 'Profile updated.'
    dpFile.value = null
    dpPreview.value = ''
    await auth.fetchMe()
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to update profile.'
  }
}

async function changePassword() {
  pwMsg.value = ''
  pwErr.value = ''
  if (pwForm.new_password !== pwForm.comfirm_password) {
    pwErr.value = 'New password and confirm password do not match.'
    return
  }
  pwLoading.value = true
  try {
    const { authApi } = await import('@/api')
    const res = await authApi.changePassword(pwForm.old_password, pwForm.new_password, pwForm.comfirm_password)
    pwMsg.value = res.data.msg || 'Password changed successfully.'
    pwForm.old_password = ''
    pwForm.new_password = ''
    pwForm.comfirm_password = ''
  } catch (e: any) {
    pwErr.value = e.response?.data?.error || 'Failed to change password.'
  } finally {
    pwLoading.value = false
  }
}
</script>

<template>
  <div class="profile">
    <h1 class="page-title">Profile & Settings</h1>
    <p class="sub">Manage your avatar and account settings.</p>

    <p v-if="msg" class="success-text">{{ msg }}</p>
    <p v-if="err" class="error-text">{{ err }}</p>

    <div class="settings-grid">
      <!-- avatar -->
      <section class="card">
        <h2>Profile Picture</h2>
        <div class="avatar-wrap">
          <img v-if="avatar" :src="avatar" alt="Profile avatar" class="avatar" />
          <div v-else class="avatar placeholder">{{ auth.user?.full_name?.[0]?.toUpperCase() || 'A' }}</div>
        </div>
        <label class="btn btn-outline file-btn">
          {{ dpFile ? dpFile.name : 'Choose a picture…' }}
          <input type="file" accept="image/*" @change="onDp" />
        </label>
      </section>

      <!-- details -->
      <section class="card">
        <h2>Account Details</h2>
        <div class="form-group">
          <label>Email</label>
          <input :value="auth.user?.email" class="form-control" disabled />
        </div>
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="profileForm.full_name" class="form-control" />
        </div>
        <div class="form-group">
          <label>Phone Number</label>
          <input v-model="profileForm.phone_number" class="form-control" />
        </div>
        <button class="btn btn-primary" @click="saveProfile">Save Changes</button>
      </section>

      <!-- password -->
      <section class="card">
        <h2>Change Password</h2>
        <p v-if="pwMsg" class="success-text">{{ pwMsg }}</p>
        <p v-if="pwErr" class="error-text">{{ pwErr }}</p>
        <div class="form-group">
          <label>Current Password</label>
          <input v-model="pwForm.old_password" type="password" class="form-control" />
        </div>
        <div class="form-group">
          <label>New Password</label>
          <input v-model="pwForm.new_password" type="password" class="form-control" />
        </div>
        <div class="form-group">
          <label>Confirm New Password</label>
          <input v-model="pwForm.comfirm_password" type="password" class="form-control" />
        </div>
        <button class="btn btn-primary" :disabled="pwLoading" @click="changePassword">
          {{ pwLoading ? 'Changing…' : 'Change Password' }}
        </button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.sub {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.card {
  background: #f8f9fc;
  border-radius: 14px;
  padding: 20px;
}

.card h2 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 14px;
}

.avatar-wrap {
  margin-bottom: 12px;
}

.avatar {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
}

.avatar.placeholder {
  background: #0a84ff;
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 1.8rem;
  font-weight: 700;
}

.file-btn {
  display: inline-flex;
  align-items: center;
  cursor: pointer;
  font-size: 0.88rem;
}

.file-btn input {
  display: none;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #666;
}

.form-control {
  border: 1.5px solid #e5e8ee;
  border-radius: 9px;
  padding: 10px 12px;
  font-size: 0.92rem;
}
</style>
