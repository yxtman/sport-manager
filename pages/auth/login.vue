<template>
	<view class="page">
		<view class="card">
			<view class="title">账号登录</view>
			<view class="hint">使用自建 MySQL 服务注册的用户名与密码</view>

			<uni-forms ref="formRef" :model="form" label-width="80">
				<uni-forms-item label="用户名" name="username" required>
					<uni-easyinput v-model="form.username" placeholder="3–64 位" />
				</uni-forms-item>
				<uni-forms-item label="密码" name="password" required>
					<uni-easyinput v-model="form.password" type="password" placeholder="至少 6 位" />
				</uni-forms-item>
			</uni-forms>

			<button class="primary" :loading="loading" @tap="submit">登录</button>
			<view class="row">
				<text class="link" @tap="goRegister">没有账号？去注册</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { apiLogin, saveSession } from '@/utils/authSession.js'

	export default {
		data() {
			return {
				loading: false,
				form: {
					username: '',
					password: ''
				}
			}
		},
		methods: {
			async submit() {
				const u = (this.form.username || '').trim()
				const p = this.form.password || ''
				if (u.length < 3 || p.length < 6) {
					uni.showToast({ title: '请填写用户名和密码', icon: 'none' })
					return
				}
				this.loading = true
				try {
					const res = await apiLogin({ username: u, password: p })
					saveSession(res.token, { username: res.username, nickname: res.nickname })
					if (this.$store && this.$store.commit) {
						this.$store.commit('reloadFromStorage')
					}
					if (this.$store && this.$store.dispatch) {
						this.$store.dispatch('sportInit')
					}
					uni.showToast({ title: '登录成功', icon: 'success' })
					setTimeout(() => {
						const pages = getCurrentPages()
						if (pages.length > 1) {
							uni.navigateBack()
						} else {
							uni.switchTab({ url: '/pages/profile/index' })
						}
					}, 400)
				} catch (e) {
					uni.showToast({ title: e.message || '登录失败', icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			goRegister() {
				uni.navigateTo({ url: '/pages/auth/register' })
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
		padding: 24rpx 20rpx;
	}

	.title {
		font-size: 34rpx;
		font-weight: 800;
		color: #111827;
	}

	.hint {
		margin-top: 10rpx;
		margin-bottom: 18rpx;
		font-size: 24rpx;
		color: #6b7280;
		line-height: 1.4;
	}

	.primary {
		margin-top: 12rpx;
		width: 100%;
		background: #1e80ff;
		color: #fff;
		border-radius: 14rpx;
		font-weight: 700;
	}

	.row {
		margin-top: 18rpx;
		text-align: center;
	}

	.link {
		color: #1e80ff;
		font-size: 26rpx;
	}
</style>
