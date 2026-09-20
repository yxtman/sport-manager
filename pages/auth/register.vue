<template>
	<view class="page">
		<view class="card">
			<view class="title">注册账号</view>
			<view class="hint">信息保存在自建 MySQL（sport_db），用于课程设计登录演示</view>

			<uni-forms ref="formRef" :model="form" label-width="80">
				<uni-forms-item label="用户名" name="username" required>
					<uni-easyinput v-model="form.username" placeholder="3–64 位，唯一" />
				</uni-forms-item>
				<uni-forms-item label="密码" name="password" required>
					<uni-easyinput v-model="form.password" type="password" placeholder="至少 6 位" />
				</uni-forms-item>
				<uni-forms-item label="昵称" name="nickname">
					<uni-easyinput v-model="form.nickname" placeholder="可选，默认与用户名相同" />
				</uni-forms-item>
			</uni-forms>

			<button class="primary" :loading="loading" @tap="submit">注册并登录</button>
			<view class="row">
				<text class="link" @tap="goLogin">已有账号？去登录</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { apiRegister, saveSession } from '@/utils/authSession.js'

	export default {
		data() {
			return {
				loading: false,
				form: {
					username: '',
					password: '',
					nickname: ''
				}
			}
		},
		methods: {
			async submit() {
				const u = (this.form.username || '').trim()
				const p = this.form.password || ''
				const nick = (this.form.nickname || '').trim()
				if (u.length < 3 || p.length < 6) {
					uni.showToast({ title: '用户名至少3位，密码至少6位', icon: 'none' })
					return
				}
				this.loading = true
				try {
					const res = await apiRegister({ username: u, password: p, nickname: nick })
					saveSession(res.token, { username: res.username, nickname: res.nickname })
					if (this.$store && this.$store.commit) {
						this.$store.commit('reloadFromStorage')
					}
					if (this.$store && this.$store.dispatch) {
						this.$store.dispatch('sportInit')
					}
					uni.showToast({ title: '注册成功', icon: 'success' })
					setTimeout(() => {
						uni.switchTab({ url: '/pages/profile/index' })
					}, 400)
				} catch (e) {
					uni.showToast({ title: e.message || '注册失败', icon: 'none' })
				} finally {
					this.loading = false
				}
			},
			goLogin() {
				uni.navigateTo({ url: '/pages/auth/login' })
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
