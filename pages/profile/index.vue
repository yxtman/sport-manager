<template>
	<view class="page">
		<view class="card">
			<view class="title">账号</view>
			<view class="account-row">
				<view class="account-main">
					<view class="account-name">
						<text v-if="userHasLogin">{{ displayName }}</text>
						<text v-else>未登录</text>
					</view>
					<view class="account-sub" v-if="userHasLogin">
						<text>用户名：{{ sessionUser.username }}</text>
					</view>
					<view class="account-sub" v-else>
						使用自建 MySQL 后端注册/登录。
					</view>
				</view>
				<button v-if="!userHasLogin" class="primary mini" @tap="goLogin">去登录</button>
				<view v-else class="account-actions">
					<button class="ghost mini account-edit" @tap="goAccount">资料</button>
					<button class="ghost mini" @tap="doLogout">退出</button>
				</view>
			</view>

			<view class="desc sync-tip">运动记录与设置保存在本机；登录后可使用个人资料、好友申请与动态。</view>
			<view v-if="userHasLogin" class="profile-link-row" @tap="goAccount">
				<text class="profile-link-label">个人资料</text>
				<text class="profile-link-arrow">修改昵称 / 密码 ›</text>
			</view>
		</view>

		<view class="card achievement-card">
			<view class="title-row">
				<view class="title">好友互通</view>
				<text class="link-text" @tap="goFeed">好友动态 ›</text>
			</view>
			<view class="social-actions">
				<button class="primary social-btn" @tap="goFriends">好友中心</button>
				<button class="ghost social-btn social-btn--feed" @tap="goFeed">查看动态</button>
			</view>
			<view class="desc sync-tip">搜索用户发送好友申请，对方同意后可互看动态、点赞和评论。</view>
		</view>

		<view class="card achievement-card">
			<view class="title-row">
				<view class="title">成就中心</view>
				<text class="link-text" @tap="goAchievements">查看全部 ›</text>
			</view>
			<view class="achievement-hero">
				<view>
					<view class="achievement-count">{{ unlockedCount }}/{{ totalCount }}</view>
					<view class="desc achievement-desc">已解锁成就，完成度 {{ completionPercent }}%</view>
				</view>
				<view class="achievement-badge">{{ currentStreak }} 天连续打卡</view>
			</view>
			<view class="achievement-progress">
				<view class="achievement-progress-fill" :style="{ width: `${completionPercent}%` }"></view>
			</view>
			<view v-if="recentUnlocked.length" class="achievement-list">
				<view v-for="item in recentUnlocked" :key="item.id" class="achievement-item">
					<text class="achievement-item__icon">{{ item.icon }}</text>
					<view class="achievement-item__main">
						<view class="achievement-item__title">{{ item.title }}</view>
						<view class="achievement-item__sub">{{ item.description }}</view>
					</view>
				</view>
			</view>
			<view v-else class="desc">先记录几条运动，系统会自动解锁你的第一枚成就。</view>
		</view>

		<view class="card">
			<view class="title">目标与设置</view>

			<uni-forms :model="form" label-width="110">
				<uni-forms-item label="每周目标(分钟)" name="weeklyMinutesGoal">
					<uni-easyinput v-model="form.weeklyMinutesGoal" type="number" placeholder="例如 150" />
				</uni-forms-item>

				<uni-forms-item label="体重(kg)" name="weightKg">
					<uni-easyinput v-model="form.weightKg" type="number" placeholder="可选" />
				</uni-forms-item>
			</uni-forms>

			<button class="primary" @tap="save">保存设置</button>
		</view>

		<view class="card">
			<view class="title">心率与区间设置</view>
			<view class="desc">用于统计页心率区间计算，填一项即可。</view>
			<uni-forms :model="form" label-width="110">
				<uni-forms-item label="最大心率" name="maxHr">
					<uni-easyinput v-model="form.maxHr" type="number" placeholder="例如 190，实测或运动后最高值" />
				</uni-forms-item>
				<uni-forms-item label="年龄" name="age">
					<uni-easyinput v-model="form.age" type="number" placeholder="未填最大心率时用 220-年龄 估算" />
				</uni-forms-item>
			</uni-forms>
			<view class="desc" v-if="effectiveMaxHr">当前采用最大心率 ≈ {{ effectiveMaxHr }}</view>
			<button class="primary" @tap="saveHr">保存心率设置</button>
		</view>

		<view class="card">
			<view class="title">每周跑步训练计划</view>

			<view class="plan-row">
				<view class="plan-label">当前计划</view>
				<view class="plan-value">
					<text v-if="currentPlanText">{{ currentPlanText }}</text>
					<text v-else>未设置</text>
				</view>
			</view>

			<uni-forms :model="planForm" label-width="110">
				<uni-forms-item label="快速选择">
					<uni-data-select v-model="planForm.presetKey" :localdata="planPresets" />
				</uni-forms-item>
			</uni-forms>

			<button class="primary" @tap="applyPlan">应用计划</button>
		</view>

		<view class="card danger">
			<view class="title">数据</view>
			<view class="desc">清空后不可恢复（清除本机全部运动记录与设置，含游客与各账号本地数据）。</view>
			<button class="ghost" @tap="resetAll">清空所有记录</button>
		</view>
	</view>
</template>

<script>
	import { mapState, mapGetters } from 'vuex'
	import { isLoggedIn, getStoredUser, clearSession, apiMe, saveSession, getToken } from '@/utils/authSession.js'
	import { pruneSharedRecords } from '@/utils/socialApi.js'
	import { feedbackSuccess } from '@/utils/uiFeedback.js'

	export default {
		data() {
			return {
				form: {
					weeklyMinutesGoal: '150',
					weightKg: '',
					maxHr: '',
					age: ''
				},
				planForm: {
					presetKey: ''
				},
				planPresets: [
					{ value: '', text: '不设置固定计划' },
					{ value: 'beginner3', text: '每周 3 次 · 30 分钟轻松跑' },
					{ value: 'standard4', text: '每周 4 次 · 40 分钟为主' },
					{ value: 'aggressive5', text: '每周 5 次 · 适合有基础' }
				],
				sessionUser: null
			}
		},
		computed: {
			...mapState(['settings']),
			...mapGetters(['weeklyRunPlan', 'effectiveMaxHr', 'achievementSnapshot']),
			userHasLogin() {
				return isLoggedIn()
			},
			displayName() {
				const u = this.sessionUser || {}
				return u.nickname || u.username || '已登录'
			},
			currentPlanText() {
				const plan = this.weeklyRunPlan || []
				if (!plan.length) return ''
				const count = plan.length
				const avgMin = Math.round(
					plan.reduce((sum, p) => sum + (p.targetMinutes || 0), 0) / count
				)
				return `每周 ${count} 次，平均 ${avgMin} 分钟/次`
			},
			unlockedCount() {
				return (this.achievementSnapshot && this.achievementSnapshot.unlockedCount) || 0
			},
			totalCount() {
				return (this.achievementSnapshot && this.achievementSnapshot.totalCount) || 0
			},
			completionPercent() {
				return (this.achievementSnapshot && this.achievementSnapshot.completionPercent) || 0
			},
			recentUnlocked() {
				return (this.achievementSnapshot && this.achievementSnapshot.recentUnlocked) || []
			},
			currentStreak() {
				return (this.achievementSnapshot && this.achievementSnapshot.stats && this.achievementSnapshot.stats.streakDays) || 0
			}
		},
		onShow() {
			const tab = this.getTabBar && this.getTabBar()
			if (tab && tab.setActive) tab.setActive('pages/profile/index')

			this.sessionUser = getStoredUser()
			if (this.userHasLogin) {
				apiMe()
					.then((info) => {
						const u = {
							id: info.id,
							username: info.username,
							nickname: info.nickname,
							createdAt: info.createdAt
						}
						this.sessionUser = u
						const t = getToken()
						if (t) saveSession(t, u)
					})
					.catch(() => {})
			}

			const s = this.settings || {}
			this.form = {
				weeklyMinutesGoal: String(s.weeklyMinutesGoal != null ? s.weeklyMinutesGoal : 150),
				weightKg: s.weightKg != null ? String(s.weightKg) : '',
				maxHr: s.maxHr != null ? String(s.maxHr) : '',
				age: s.age != null ? String(s.age) : ''
			}
		},
		methods: {
			goLogin() {
				uni.navigateTo({ url: '/pages/auth/login' })
			},
			goAccount() {
				uni.navigateTo({ url: '/pages/profile/account' })
			},
			goAchievements() {
				uni.navigateTo({ url: '/pages/profile/achievements' })
			},
			goFriends() {
				uni.navigateTo({ url: '/pages/social/friends' })
			},
			goFeed() {
				uni.navigateTo({ url: '/pages/social/feed' })
			},
			doLogout() {
				uni.showModal({
					title: '退出登录',
					content: '确定要退出登录吗？',
					success: (res) => {
						if (!res.confirm) return
						clearSession()
						this.sessionUser = null
						if (this.$store && this.$store.commit) {
							this.$store.commit('reloadFromStorage')
						}
						uni.showToast({ title: '已退出', icon: 'none' })
					}
				})
			},
			save() {
				const weekly = Number(this.form.weeklyMinutesGoal)
				const weight = this.form.weightKg === '' ? null : Number(this.form.weightKg)

				if (!Number.isFinite(weekly) || weekly <= 0) {
					uni.showToast({ title: '周目标请输入正数', icon: 'none' })
					return
				}
				if (weight != null && (!Number.isFinite(weight) || weight <= 0)) {
					uni.showToast({ title: '体重请输入正数或留空', icon: 'none' })
					return
				}

				this.$store.commit('setSettings', {
					weeklyMinutesGoal: Math.round(weekly),
					weightKg: weight == null ? null : Number(weight)
				})
				feedbackSuccess('已保存')
			},
			saveHr() {
				const maxHr = this.form.maxHr === '' ? null : Number(this.form.maxHr)
				const age = this.form.age === '' ? null : Number(this.form.age)
				if (maxHr != null && (!Number.isFinite(maxHr) || maxHr <= 0 || maxHr > 250)) {
					uni.showToast({ title: '最大心率请填 1–250 或留空', icon: 'none' })
					return
				}
				if (age != null && (!Number.isFinite(age) || age <= 0 || age >= 120)) {
					uni.showToast({ title: '年龄请填 1–119 或留空', icon: 'none' })
					return
				}
				this.$store.commit('setSettings', {
					maxHr: maxHr == null ? null : Math.round(maxHr),
					age: age == null ? null : Math.round(age)
				})
				feedbackSuccess('已保存')
			},
			applyPlan() {
				const key = this.planForm.presetKey
				let plan = []
				if (key === 'beginner3') {
					plan = [
						{ weekday: 2, type: '跑步', runSubtype: '轻松跑', targetMinutes: 30 },
						{ weekday: 4, type: '跑步', runSubtype: '轻松跑', targetMinutes: 30 },
						{ weekday: 6, type: '跑步', runSubtype: '长距离', targetMinutes: 40 }
					]
				} else if (key === 'standard4') {
					plan = [
						{ weekday: 1, type: '跑步', runSubtype: '轻松跑', targetMinutes: 35 },
						{ weekday: 3, type: '跑步', runSubtype: '间歇跑', targetMinutes: 30 },
						{ weekday: 5, type: '跑步', runSubtype: '节奏跑', targetMinutes: 35 },
						{ weekday: 7, type: '跑步', runSubtype: '长距离', targetMinutes: 50 }
					]
				} else if (key === 'aggressive5') {
					plan = [
						{ weekday: 1, type: '跑步', runSubtype: '轻松跑', targetMinutes: 35 },
						{ weekday: 2, type: '跑步', runSubtype: '间歇跑', targetMinutes: 30 },
						{ weekday: 4, type: '跑步', runSubtype: '节奏跑', targetMinutes: 40 },
						{ weekday: 5, type: '跑步', runSubtype: '轻松跑', targetMinutes: 35 },
						{ weekday: 7, type: '跑步', runSubtype: '长距离', targetMinutes: 60 }
					]
				}

				this.$store.commit('setSettings', { weeklyRunPlan: plan })
				feedbackSuccess('训练计划已更新')
			},
			resetAll() {
				uni.showModal({
					title: '清空数据',
					content: '确定要清空所有运动记录和设置吗？',
					success: (res) => {
						if (!res.confirm) return
						this.$store.commit('resetAll')
						if (isLoggedIn()) {
							pruneSharedRecords([]).catch(() => {})
						}
						feedbackSuccess('已清空')
						this.form = { weeklyMinutesGoal: '150', weightKg: '', maxHr: '', age: '' }
						this.planForm = { presetKey: '' }
					}
				})
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 24rpx 24rpx calc(24rpx + 60px) 24rpx;
	}

	.card {
		background: #fff;
		border-radius: 16rpx;
		padding: 22rpx 20rpx;
	}

	.card + .card {
		margin-top: 20rpx;
	}

	.title {
		font-size: 30rpx;
		font-weight: 900;
		color: #111827;
		margin-bottom: 14rpx;
	}

	.title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
		margin-bottom: 14rpx;
	}

	.link-text {
		font-size: 24rpx;
		color: #1e80ff;
		font-weight: 700;
	}

	.achievement-card {
		background: linear-gradient(180deg, #ffffff, #f8fbff);
	}

	.achievement-hero {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
	}

	.achievement-count {
		font-size: 42rpx;
		font-weight: 900;
		color: #111827;
	}

	.achievement-desc {
		margin-top: 8rpx;
		margin-bottom: 0;
	}

	.achievement-badge {
		padding: 12rpx 20rpx;
		border-radius: 999px;
		background: rgba(30, 128, 255, 0.12);
		color: #1e80ff;
		font-size: 24rpx;
		font-weight: 800;
		white-space: nowrap;
	}

	.achievement-progress {
		height: 14rpx;
		background: rgba(30, 128, 255, 0.12);
		border-radius: 999px;
		overflow: hidden;
		margin-top: 18rpx;
	}

	.achievement-progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #1e80ff, #60a5fa);
		border-radius: 999px;
	}

	.achievement-list {
		margin-top: 16rpx;
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.social-actions {
		display: flex;
		gap: 16rpx;
	}

	.social-btn {
		flex: 1;
	}

	.social-btn--feed {
		color: #1e80ff;
		border-color: rgba(30, 128, 255, 0.35);
	}

	.achievement-item {
		display: flex;
		align-items: center;
		gap: 14rpx;
		padding: 14rpx 16rpx;
		background: #fff;
		border-radius: 14rpx;
		border: 1px solid rgba(30, 128, 255, 0.08);
	}

	.achievement-item__icon {
		font-size: 36rpx;
		line-height: 1;
	}

	.achievement-item__main {
		flex: 1;
		min-width: 0;
	}

	.achievement-item__title {
		font-size: 26rpx;
		font-weight: 800;
		color: #111827;
	}

	.achievement-item__sub {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #6b7280;
	}

	.desc {
		color: #6b7280;
		font-size: 24rpx;
		margin-bottom: 10rpx;
	}

	.sync-tip {
		margin-top: 12rpx;
		margin-bottom: 0;
		line-height: 1.45;
	}

	.primary {
		margin-top: 10rpx;
		background: #1e80ff;
		color: #fff;
		border-radius: 14rpx;
		font-weight: 800;
	}

	.danger .desc {
		color: #6b7280;
		font-size: 24rpx;
		margin-bottom: 14rpx;
	}

	.ghost {
		background: #fff;
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.35);
		border-radius: 14rpx;
		font-weight: 800;
	}

	.mini {
		margin-top: 0;
		height: 70rpx;
		line-height: 70rpx;
		padding: 0 18rpx;
		border-radius: 999px;
		font-size: 26rpx;
	}

	.account-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
	}

	.account-actions {
		display: flex;
		gap: 12rpx;
		flex-shrink: 0;
	}

	.account-edit {
		color: #1e80ff;
		border-color: rgba(30, 128, 255, 0.35);
	}

	.profile-link-row {
		margin-top: 16rpx;
		padding: 18rpx 16rpx;
		background: rgba(30, 128, 255, 0.06);
		border-radius: 14rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.profile-link-label {
		font-size: 26rpx;
		font-weight: 800;
		color: #111827;
	}

	.profile-link-arrow {
		font-size: 24rpx;
		color: #1e80ff;
		font-weight: 700;
	}

	.account-main {
		flex: 1;
		min-width: 0;
	}

	.account-name {
		font-size: 28rpx;
		font-weight: 900;
		color: #111827;
	}

	.account-sub {
		margin-top: 6rpx;
		color: #6b7280;
		font-size: 24rpx;
	}

	.plan-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 10rpx;
	}

	.plan-label {
		font-size: 24rpx;
		color: #4b5563;
	}

	.plan-value {
		font-size: 24rpx;
		color: #111827;
	}
</style>
