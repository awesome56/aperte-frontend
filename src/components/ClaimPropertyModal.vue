<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { propertyApi, type Property } from '@/api'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ property: Property; initialStatus?: string | null }>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'updated', status: string): void
}>()

const router = useRouter()
const auth = useAuthStore()

const step = ref<'choose' | 'document' | 'verification' | 'submitted'>(props.initialStatus === 'pending_verification' ? 'verification' : 'choose')
const status = ref<string | null>(props.initialStatus || null)
const msg = ref('')
const err = ref('')
const busy = ref(false)
const verificationEmail = ref('')
const verifyCode = ref('')
const resending = ref(false)
const documentFile = ref<File | null>(null)
const method = ref<'email' | 'document' | null>(null)

async function chooseMethod(m: 'email' | 'document') {
  method.value = m
  msg.value = ''
  err.value = ''
  if (m === 'email') {
    await startClaim()
  } else {
    step.value = 'document'
  }
}

async function startClaim() {
  busy.value = true
  msg.value = ''
  err.value = ''
  try {
    const res = await propertyApi.claim(props.property.id)
    status.value = res.data.claim.status
    verificationEmail.value = res.data.verification_email || ''
    msg.value = res.data.message
    step.value = 'verification'
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent('property_claim', 'conversion', { property_id: props.property.id }),
    )
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to claim property.'
  } finally {
    busy.value = false
  }
}

async function submitDocumentClaim() {
  if (!documentFile.value) return
  busy.value = true
  msg.value = ''
  err.value = ''
  try {
    const res = await propertyApi.claimWithDocument(props.property.id, documentFile.value)
    status.value = res.data.claim.status
    msg.value = res.data.message
    step.value = 'submitted'
    emit('updated', status.value)
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent('property_claim_document', 'conversion', { property_id: props.property.id }),
    )
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to submit claim.'
  } finally {
    busy.value = false
  }
}

async function verifyClaim() {
  if (!verifyCode.value.trim()) return
  busy.value = true
  msg.value = ''
  err.value = ''
  try {
    const res = await propertyApi.claimVerify(props.property.id, verifyCode.value.trim())
    status.value = res.data.claim.status
    msg.value = res.data.message
    step.value = 'submitted'
    emit('updated', status.value)
    import('@/analytics/tracker').then((m) =>
      m.default.trackEvent('property_claim_verified', 'conversion', { property_id: props.property.id }),
    )
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Verification failed.'
  } finally {
    busy.value = false
  }
}

async function resendCode() {
  resending.value = true
  err.value = ''
  try {
    const res = await propertyApi.claimResend(props.property.id)
    msg.value = res.data.message
  } catch (e: any) {
    err.value = e.response?.data?.error || 'Failed to resend code.'
  } finally {
    resending.value = false
  }
}

function onDocumentPick(e: Event) {
  documentFile.value = (e.target as HTMLInputElement).files?.[0] || null
  err.value = ''
}

function retry() {
  // rejected -> start over
  status.value = null
  step.value = 'choose'
  method.value = null
  msg.value = ''
  err.value = ''
  verifyCode.value = ''
  documentFile.value = null
}

function close() {
  emit('close')
}

function signIn() {
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="claim-overlay" @click.self="close">
      <div class="claim-modal">
        <button class="modal-close" title="Close" @click="close">×</button>

        <h3>Claim {{ property.title }}</h3>

        <!-- not signed in -->
        <div v-if="!auth.isAuthenticated" class="claim-body">
          <p class="note">Sign in to claim this property.</p>
          <button class="btn btn-primary btn-block" @click="signIn">Sign In / Register</button>
        </div>

        <!-- already owned -->
        <div v-else-if="status === 'approved'" class="claim-body">
          <p class="status approved">✓ You own this property.</p>
          <button class="btn btn-primary btn-block" @click="close">Close</button>
        </div>

        <template v-else>
          <!-- rejected -> offer retry -->
          <div v-if="status === 'rejected'" class="claim-body">
            <p class="status rejected">Your previous claim was declined.</p>
            <button class="btn btn-primary btn-block" @click="retry">Try Again</button>
          </div>

          <!-- CHOOSE METHOD -->
          <div v-else-if="step === 'choose'" class="claim-body">
            <p class="note">How would you like to verify your ownership of this property?</p>

            <button class="method-card" :disabled="busy" @click="chooseMethod('email')">
              <span class="method-icon">@</span>
              <span class="method-text">
                <strong>Verify with Email</strong>
                <small>Receive a 6-digit code on your email</small>
              </span>
            </button>

            <button class="method-card disabled" disabled title="Coming soon">
              <span class="method-icon">📞</span>
              <span class="method-text">
                <strong>Verify with Phone</strong>
                <small>Coming soon</small>
              </span>
            </button>

            <button class="method-card" :disabled="busy" @click="chooseMethod('document')">
              <span class="method-icon">📄</span>
              <span class="method-text">
                <strong>Submit a Document</strong>
                <small>Upload supporting ownership documents</small>
              </span>
            </button>

            <p v-if="msg" class="status approved">{{ msg }}</p>
            <p v-if="err" class="status rejected">{{ err }}</p>
          </div>

          <!-- DOCUMENT -->
          <div v-else-if="step === 'document'" class="claim-body">
            <p class="note">
              Upload a supporting document (PDF, image or Word file) — the admin will review it before transferring ownership.
            </p>
            <label class="doc-pick">
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.webp" @change="onDocumentPick" />
              {{ documentFile ? documentFile.name : 'Choose a document…' }}
            </label>
            <button class="btn btn-primary btn-block" :disabled="!documentFile || busy" @click="submitDocumentClaim">
              {{ busy ? 'Uploading…' : 'Submit Claim' }}
            </button>
            <button class="resend-link" :disabled="busy" @click="step = 'choose'; method = null; documentFile = null">
              ← Back to methods
            </button>
            <p v-if="msg" class="status approved">{{ msg }}</p>
            <p v-if="err" class="status rejected">{{ err }}</p>
          </div>

          <!-- VERIFICATION -->
          <div v-else-if="step === 'verification'" class="claim-body">
            <p class="note">
              We sent a 6-digit verification code to <strong>{{ verificationEmail || 'your email' }}</strong>.
              Enter it below to confirm ownership.
            </p>
            <div class="verify-row">
              <input
                v-model="verifyCode"
                class="verify-input"
                placeholder="6-digit code"
                maxlength="6"
                :disabled="busy"
              />
              <button class="btn btn-primary" :disabled="busy || verifyCode.trim().length < 6" @click="verifyClaim">
                {{ busy ? 'Verifying…' : 'Verify' }}
              </button>
            </div>
            <button class="resend-link" :disabled="resending" @click="resendCode">
              {{ resending ? 'Sending…' : 'Resend code' }}
            </button>
            <p v-if="msg" class="status approved">{{ msg }}</p>
            <p v-if="err" class="status rejected">{{ err }}</p>
          </div>

          <!-- SUBMITTED -->
          <div v-else class="claim-body">
            <p class="status pending">Your claim is pending review by the admin.</p>
            <p class="note">You'll be able to manage the property once it's approved.</p>
            <button class="btn btn-primary btn-block" @click="close">Close</button>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.claim-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(10, 12, 20, 0.6);
  backdrop-filter: blur(3px);
  display: grid;
  place-items: center;
  padding: 20px;
}

.claim-modal {
  position: relative;
  background: #fff;
  border-radius: 16px;
  width: min(92vw, 440px);
  padding: 28px 26px 26px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  max-height: 90vh;
  overflow-y: auto;
}

.claim-modal h3 {
  font-size: 1.25rem;
  color: var(--color-purple-dark, #1c1c1c);
  margin-bottom: 16px;
  padding-right: 24px;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: #f0f0f2;
  color: #666;
  font-size: 1rem;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover {
  background: #e2e2e5;
  color: #1c1c1c;
}

.claim-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.note {
  color: var(--color-muted, #555);
  font-size: 0.92rem;
  line-height: 1.5;
}

.status {
  font-weight: 600;
  font-size: 0.95rem;
  margin: 0;
}

.status.approved {
  color: #1a7f37;
}

.status.pending {
  color: #b7791f;
}

.status.rejected {
  color: #d0342c;
}

.doc-pick {
  display: block;
  border: 1.5px dashed var(--color-primary, #0a84ff);
  border-radius: 8px;
  padding: 14px;
  text-align: center;
  color: var(--color-primary, #0a84ff);
  font-size: 0.9rem;
  cursor: pointer;
  background: var(--color-bg-blue, #f0f6ff);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-pick input {
  display: none;
}

.verify-row {
  display: flex;
  gap: 8px;
}

.verify-input {
  flex: 1;
  border: 1.5px solid var(--color-primary, #0a84ff);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 1.05rem;
  letter-spacing: 4px;
  text-align: center;
  font-weight: 600;
}

.resend-link {
  background: none;
  border: none;
  color: var(--color-primary, #0a84ff);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  align-self: flex-start;
}

.resend-link:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.method-card {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  border: 1.5px solid var(--color-border, #e5e5e7);
  border-radius: 12px;
  background: #fff;
  padding: 14px 16px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s, background 0.15s;
}

.method-card:hover:not(.disabled) {
  border-color: var(--color-primary, #0a84ff);
  background: var(--color-bg-blue, #f0f6ff);
}

.method-card.disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.method-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--color-bg-blue, #f0f6ff);
  color: var(--color-primary, #0a84ff);
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  flex-shrink: 0;
}

.method-text {
  display: flex;
  flex-direction: column;
}

.method-text strong {
  color: var(--color-dark, #1c1c1c);
  font-size: 0.95rem;
}

.method-text small {
  color: var(--color-muted, #666);
  font-size: 0.8rem;
}
</style>
