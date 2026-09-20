<template>
	<view class="page">
		<view class="card">
			<view class="title">基本信息</view>
			<view class="info-row">
				<text class="label">用户名</text>
				<text class="value">{{ profile.username || '—' }}</text>
			</view>
			<view class="info-row" v-if="profile.createdAt">
				<text class="label">注册时间</text>
				<text class="value">{{ formatDate(profile.createdAt) }}</text>
			</view>

			<uni-forms :model="profileForm" label-width="80">
				<uni-forms-item label="昵称" name="nickname" required>
					<uni-easyinput v-model="profileForm.nickname" placeholder="1–64 字" />
				</uni-forms-item>
			</uni-forms>
			<button class="primary" :loading="savingProfile" @tap="saveProfile">保存昵称</button>
		</view>

		<view class="card">
			<view class="title">修改密码</view>
			<view class="hint">修改成功后仍保持当前登录状态。</view>
			<uni-forms :model="pwdForm" label-width="90">
				<uni-forms-item label="原密码" name="oldPassword" required>
					<uni-easyinput v-model="pwdForm.oldPassword" type="password" placeholder="当前密码" />
				</uni-forms-item>
				<uni-forms-item label="新密码" name="newPassword" required>
					<uni-easyinput v-model="pwdForm.newPassword" type="password" placeholder="至少 6 位" />
				</uni-forms-item>
				<uni-forms-item label="确认新密码" name="confirmPassword" required>
					<uni-easyinput v-model="pwdForm.confirmPassword" type="password" placeholder="再次输入" />
				</uni-forms-item>
			</uni-forms>
			<button class="primary" :loading="savingPwd" @tap="savePassword">修改密码</button>
		</view>
	</view>
</template>

<script>
	import { isLoggedIn, apiMe, apiUpdateProfile, apiChangePassword, saveSession, getToken } from '@/utils/authSession.js'
	import { feedbackSuccess } from '@/utils/uiFeedback.js'

	export default {
		data() {
			return {
				profile: {},
				profileForm: { nickname: '' },
				pwdForm: {
					oldPassword: '',
					newPassword: '',
					confirmPassword: ''
				},
				savingProfile: false,
				savingPwd: false
			}
		},
		onShow() {
			if (!isLoggedIn()) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				setTimeout(() => uni.navigateTo({ url: '/pages/auth/login' }), 500)
				return
			}
			this.loadProfile()
		},
		methods: {
			loadProfile() {
				apiMe()
					.then((info) => {
						this.profile = info || {}
						this.profileForm.nickname = info.nickname || ''
						const t = getToken()
						if (t) {
							saveSession(t, {
								id: info.id,
								username: info.username,
								nickname: info.nickname,
								createdAt: info.createdAt
							})
						}
					})
					.catch((e) => {
						uni.showToast({ title: e.message || '加载失败', icon: 'none' })
					})
			},
			saveProfile() {
				const nick = (this.profileForm.nickname || '').trim()
				if (!nick) {
					uni.showToast({ title: '昵称不能为空', icon: 'none' })
					return
				}
				this.savingProfile = true
				apiUpdateProfile({ nickname: nick })
					.then((info) => {
						this.profile = info || {}
						this.profileForm.nickname = info.nickname || nick
						const t = getToken()
						if (t) {
							saveSession(t, {
								id: info.id,
								username: info.username,
								nickname: info.nickname,
								createdAt: info.createdAt
							})
						}
						feedbackSuccess('昵称已更新')
					})
					.catch((e) => {
						uni.showToast({ title: e.message || '保存失败', icon: 'none' })
					})
					.finally(() => { this.savingProfile = false })
			},
			savePassword() {
				const oldPassword = this.pwdForm.oldPassword || ''
				const newPassword = this.pwdForm.newPassword || ''
				const confirmPassword = this.pwdForm.confirmPassword || ''
				if (oldPassword.length < 1) {
					uni.showToast({ title: '请输入原密码', icon: 'none' })
					return
				}
				if (newPassword.length < 6) {
					uni.showToast({ title: '新密码至少 6 位', icon: 'none' })
					return
				}
				if (newPassword !== confirmPassword) {
					uni.showToast({ title: '两次新密码不一致', icon: 'none' })
					return
				}
				this.savingPwd = true
				apiChangePassword({ oldPassword, newPassword })
					.then(() => {
						this.pwdForm = { oldPassword: '', newPassword: '', confirmPassword: '' }
						feedbackSuccess('密码已修改')
					})
					.catch((e) => {
						uni.showToast({ title: e.message || '修改失败', icon: 'none' })
					})
					.finally(() => { this.savingPwd = false })
			},
			formatDate(iso) {
				if (!iso) return '—'
				try {
					const d = new Date(iso)
					if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
					const y = d.getFullYear()
					const m = String(d.getMonth() + 1).padStart(2, '0')
					const day = String(d.getDate()).padStart(2, '0')
					return `${y}-${m}-${day}`
				} catch (e) {
					return String(iso).slice(0, 10)
				}
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 24rpx;
	}

	.card {
		background: #fff;
		border-radius: 16rpx;
		padding: 22rpx 20rpx;
		margin-bottom: 20rpx;
	}

	.title {
		font-size: 30rpx;
		font-weight: 900;
		color: #111827;
		margin-bottom: 14rpx;
	}

	.hint {
		color: #6b7280;
		font-size: 24rpx;
		margin-bottom: 14rpx;
		line-height: 1.45;
	}

	.info-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14rpx 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		margin-bottom: 10rpx;
	}

	.label {
		font-size: 26rpx;
		color: #6b7280;
	}

	.value {
		font-size: 26rpx;
		color: #111827;
		font-weight: 700;
	}

	.primary {
		margin-top: 10rpx;
		background: #1e80ff;
		color: #fff;
		border-radius: 14rpx;
		font-weight: 800;
	}
</style>
