<template>
	<view class="page">
		<view class="hero">
			<view class="hero__title">{{ todayTitle }}</view>
			<view class="hero__grid">
				<view class="metric">
					<view class="metric__value">{{ today.minutes }}</view>
					<view class="metric__label">分钟</view>
				</view>
				<view class="metric">
					<view class="metric__value">{{ formatNumber(today.distanceKm) }}</view>
					<view class="metric__label">公里</view>
				</view>
				<view class="metric">
					<view class="metric__value">{{ today.calories }}</view>
					<view class="metric__label">千卡</view>
				</view>
			</view>
		</view>

		<view class="quick-card">
			<view class="quick-card__head">
				<text class="quick-card__title">快速记录</text>
				<text class="quick-card__link" @tap="goAdd">完整表单 ›</text>
			</view>
			<text class="quick-card__hint">默认从当前时间起算一条记录；跑步且填写距离时，可按体重估算消耗。</text>

			<view class="quick-card__label">类型</view>
			<view class="type-row">
				<view
					v-for="t in quickTypes"
					:key="t"
					class="type-chip"
					:class="{ 'type-chip--on': quickType === t }"
					@tap="quickType = t"
				>
					{{ t }}
				</view>
			</view>

			<view class="quick-card__label">常用时长</view>
			<view class="preset-row">
				<view
					v-for="m in durationPresets"
					:key="m"
					class="preset-chip"
					:class="{ 'preset-chip--on': quickDuration === String(m) }"
					@tap="quickDuration = String(m)"
				>
					{{ m }} 分
				</view>
			</view>

			<view class="quick-fields">
				<view class="quick-field">
					<text class="quick-field__lab">时长(分)</text>
					<input class="quick-field__inp" type="number" v-model="quickDuration" placeholder="必填" />
				</view>
				<view class="quick-field">
					<text class="quick-field__lab">距离(km)</text>
					<input class="quick-field__inp" type="digit" v-model="quickDistance" placeholder="可选" />
				</view>
			</view>

			<button class="quick-save" @tap="quickSave">保存本条记录</button>
		</view>

		<view class="section" v-if="advice.items && advice.items.length">
			<view class="section__title">智能建议</view>
			<view class="advice-list">
				<view v-for="a in advice.items" :key="a.id" class="advice" :class="adviceClass(a.level)">
					<view class="advice__head">
						<text class="advice__title">{{ a.title }}</text>
						<text class="advice__tag">{{ levelText(a.level) }}</text>
					</view>
					<view class="advice__text">{{ a.text }}</view>
					<view class="advice__actions" v-if="a.actions && a.actions.length">
						<button
							v-for="act in a.actions"
							:key="act.label"
							class="advice__btn"
							size="mini"
							@tap="go(act.url)"
						>
							{{ act.label }}
						</button>
					</view>
				</view>
			</view>
		</view>

		<view class="section" v-if="plan.totalSessions">
			<view class="section__title">本周训练计划</view>
			<view class="plan">
				<view class="plan__top">
					<text class="plan__progress">{{ plan.completedSessions }}/{{ plan.totalSessions }} 次已完成</text>
					<text v-if="plan.nextSession" class="plan__next">
						下次：周{{ weekdayLabel(plan.nextSession.weekday) }}
						{{ plan.nextSession.runSubtype || '跑步' }}
						{{ plan.nextSession.targetMinutes || 0 }} 分钟
					</text>
				</view>
				<view class="plan__bar">
					<view class="plan__barFill" :style="{ width: `${planPercent}%` }"></view>
				</view>
			</view>
		</view>

		<view class="section" v-if="achievement.unlockedCount">
			<view class="section__title">最近解锁</view>
			<view class="achievement-strip">
				<view v-for="item in achievement.recentUnlocked" :key="item.id" class="achievement-chip" @tap="goAchievements">
					<text class="achievement-chip__icon">{{ item.icon }}</text>
					<view class="achievement-chip__main">
						<view class="achievement-chip__title">{{ item.title }}</view>
						<view class="achievement-chip__sub">{{ item.unlockedDateText }}</view>
					</view>
				</view>
			</view>
		</view>

		<view class="section">
			<view class="section__title">最近运动</view>
			<view v-if="recent.length === 0" class="empty">
				<view class="empty__illus">🏃</view>
				<view class="empty__title">暂无运动记录</view>
				<view class="empty__tips">在上方选类型、时长后点「保存」；或去完整表单填写距离、心率等。</view>
				<button class="empty__btn" @tap="goAdd">打开完整表单</button>
			</view>
			<view v-else class="list">
				<view v-for="r in recent" :key="r.id" class="cell" @tap="goEdit(r.id)">
					<view class="cell__main">
						<view class="cell__title">{{ r.type }}</view>
						<view class="cell__sub">
							{{ toLocalTime(r.startAt) }} · {{ r.durationMin }} 分钟
							<text v-if="r.distanceKm != null"> · {{ formatNumber(r.distanceKm) }} 公里</text>
							<text v-if="r.calories != null"> · {{ r.calories }} 千卡</text>
							<text v-if="r.paceSecPerKm != null"> · {{ formatPace(r.paceSecPerKm) }}</text>
							<text v-if="r.avgHr != null"> · 平均心率 {{ r.avgHr }}</text>
						</view>
					</view>
					<text class="cell__arrow">›</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapGetters, mapState } from 'vuex'
	import { feedbackSuccess } from '@/utils/uiFeedback.js'
	import { isLoggedIn } from '@/utils/authSession.js'
	import { syncSportRecord } from '@/utils/socialApi.js'

	export default {
		data() {
			return {
				quickType: '跑步',
				quickDuration: '30',
				quickDistance: '',
				quickTypes: ['跑步', '步行', '骑行', '力量', '游泳', '瑜伽', '其它'],
				durationPresets: [20, 30, 45, 60]
			}
		},
		computed: {
			...mapState(['settings']),
			...mapGetters([
				'todaySummary',
				'recordsSorted',
				'weeklyPlanProgress',
				'achievementSnapshot',
				'smartAdvice'
			]),
			today() {
				return this.todaySummary || { minutes: 0, distanceKm: 0, calories: 0, count: 0 }
			},
			todayTitle() {
				const records = this.recordsSorted || []
				const todayStart = new Date()
				todayStart.setHours(0, 0, 0, 0)
				const todayRecords = records.filter(r => new Date(r.startAt) >= todayStart)
				if (!todayRecords.length) return '今日运动'
				const countByType = {}
				todayRecords.forEach(r => {
					countByType[r.type] = (countByType[r.type] || 0) + 1
				})
				const topType = Object.entries(countByType).sort((a, b) => b[1] - a[1])[0][0]
				return `今日${topType}`
			},
			recent() {
				return (this.recordsSorted || []).slice(0, 5)
			},
			plan() {
				return this.weeklyPlanProgress || { totalSessions: 0, completedSessions: 0, nextSession: null }
			},
			planPercent() {
				const total = this.plan.totalSessions || 0
				if (!total) return 0
				return Math.round((this.plan.completedSessions / total) * 100)
			},
			achievement() {
				return this.achievementSnapshot || {
					unlockedCount: 0,
					recentUnlocked: []
				}
			},
			advice() {
				return this.smartAdvice || { items: [] }
			}
		},
		onShow() {
			const tab = this.getTabBar && this.getTabBar()
			if (tab && tab.setActive) tab.setActive('pages/home/index')
		},
		onPullDownRefresh() {
			setTimeout(() => {
				try {
					uni.stopPullDownRefresh()
				} catch (e) {}
				uni.showToast({ title: '已刷新', icon: 'none', duration: 1200 })
			}, 280)
		},
		methods: {
			quickSave() {
				const duration = Number(this.quickDuration)
				if (!this.quickType || !Number.isFinite(duration) || duration <= 0) {
					uni.showToast({ title: '请选择类型并填写有效时长', icon: 'none' })
					return
				}
				const distRaw = String(this.quickDistance || '').trim()
				let distanceKm = null
				if (distRaw !== '') {
					const d = Number(distRaw)
					if (!Number.isFinite(d) || d < 0) {
						uni.showToast({ title: '距离格式不正确', icon: 'none' })
						return
					}
					distanceKm = d
				}
				const w = this.settings && this.settings.weightKg != null ? Number(this.settings.weightKg) : null
				const payload = {
					type: this.quickType,
					startAt: new Date().toISOString(),
					durationMin: duration,
					distanceKm,
					calories: null,
					runSubtype: this.quickType === '跑步' ? '' : '',
					perceivedEffort: null,
					avgHr: null,
					maxHr: null,
					shoes: '',
					checkInImage: '',
					note: '',
					weightKg: Number.isFinite(w) ? w : null
				}
				this.$store.commit('addRecord', payload)
				const savedRecord = this.$store && this.$store.state && this.$store.state.lastSavedRecord
				if (isLoggedIn() && savedRecord) {
					syncSportRecord(savedRecord).catch(() => {})
				}
				feedbackSuccess('已保存')
				this.quickDistance = ''
			},
			go(url) {
				if (!url) return
				if (String(url).startsWith('/pages/')) {
					uni.navigateTo({ url })
					return
				}
				uni.navigateTo({ url })
			},
			adviceClass(level) {
				if (level === 'warn') return 'advice--warn'
				if (level === 'good') return 'advice--good'
				return 'advice--info'
			},
			levelText(level) {
				if (level === 'warn') return '恢复'
				if (level === 'good') return '不错'
				return '建议'
			},
			goAdd() {
				uni.navigateTo({ url: '/pages/record/edit' })
			},
			goAchievements() {
				uni.navigateTo({ url: '/pages/profile/achievements' })
			},
			goEdit(id) {
				uni.navigateTo({ url: `/pages/record/edit?id=${encodeURIComponent(id)}` })
			},
			toLocalTime(iso) {
				const d = new Date(iso)
				const mm = String(d.getMonth() + 1).padStart(2, '0')
				const dd = String(d.getDate()).padStart(2, '0')
				const hh = String(d.getHours()).padStart(2, '0')
				const mi = String(d.getMinutes()).padStart(2, '0')
				return `${mm}-${dd} ${hh}:${mi}`
			},
			formatNumber(n) {
				if (n == null || Number.isNaN(Number(n))) return '0'
				const v = Number(n)
				return v % 1 === 0 ? String(v) : v.toFixed(2)
			},
			formatPace(secPerKm) {
				if (!Number.isFinite(secPerKm) || secPerKm <= 0) return ''
				const total = Math.round(secPerKm)
				const min = Math.floor(total / 60)
				const sec = total % 60
				return `${min}:${sec.toString().padStart(2, '0')} /km`
			},
			weekdayLabel(n) {
				const map = {
					1: '一',
					2: '二',
					3: '三',
					4: '四',
					5: '五',
					6: '六',
					7: '日'
				}
				return map[n] || n
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 24rpx 24rpx calc(24rpx + 60px) 24rpx;
	}

	.hero {
		background: linear-gradient(180deg, #1e80ff, #3aa0ff);
		border-radius: 20rpx;
		padding: 28rpx;
		color: #fff;
	}

	.hero__title {
		font-size: 36rpx;
		font-weight: 700;
	}

	.hero__grid {
		display: flex;
		margin-top: 18rpx;
	}

	.metric {
		flex: 1;
		padding: 10rpx 0;
	}

	.metric__value {
		font-size: 44rpx;
		font-weight: 800;
		line-height: 1.1;
	}

	.metric__label {
		opacity: 0.9;
		font-size: 24rpx;
		margin-top: 6rpx;
	}

	.quick-card {
		margin-top: 20rpx;
		background: #fff;
		border-radius: 20rpx;
		padding: 24rpx 22rpx 22rpx;
		box-shadow: 0 8rpx 28rpx rgba(15, 23, 42, 0.06);
	}

	.quick-card__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8rpx;
	}

	.quick-card__title {
		font-size: 32rpx;
		font-weight: 800;
		color: #111827;
	}

	.quick-card__link {
		font-size: 26rpx;
		color: #1e80ff;
		font-weight: 600;
	}

	.quick-card__hint {
		display: block;
		font-size: 22rpx;
		color: #9ca3af;
		line-height: 1.45;
		margin-bottom: 18rpx;
	}

	.quick-card__label {
		font-size: 24rpx;
		color: #6b7280;
		font-weight: 600;
		margin-bottom: 10rpx;
		margin-top: 8rpx;
	}

	.type-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-bottom: 8rpx;
	}

	.type-chip {
		padding: 10rpx 20rpx;
		border-radius: 999px;
		font-size: 24rpx;
		color: #374151;
		background: #f3f4f6;
		border: 1px solid transparent;
	}

	.type-chip--on {
		background: rgba(30, 128, 255, 0.12);
		color: #1e80ff;
		border-color: rgba(30, 128, 255, 0.35);
		font-weight: 700;
	}

	.preset-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-bottom: 16rpx;
	}

	.preset-chip {
		padding: 8rpx 18rpx;
		border-radius: 12rpx;
		font-size: 24rpx;
		color: #4b5563;
		background: #f9fafb;
		border: 1px solid #e5e7eb;
	}

	.preset-chip--on {
		background: #1e80ff;
		color: #fff;
		border-color: #1e80ff;
		font-weight: 600;
	}

	.quick-fields {
		display: flex;
		gap: 16rpx;
		margin-bottom: 18rpx;
	}

	.quick-field {
		flex: 1;
		background: #f9fafb;
		border-radius: 14rpx;
		padding: 14rpx 16rpx;
		border: 1px solid #eef0f3;
	}

	.quick-field__lab {
		display: block;
		font-size: 22rpx;
		color: #6b7280;
		margin-bottom: 8rpx;
	}

	.quick-field__inp {
		width: 100%;
		font-size: 30rpx;
		font-weight: 700;
		color: #111827;
		height: 44rpx;
		line-height: 44rpx;
	}

	.quick-save {
		width: 100%;
		background: #1e80ff;
		color: #fff;
		border-radius: 14rpx;
		font-weight: 700;
		font-size: 30rpx;
		padding: 22rpx 0;
	}

	.section {
		margin-top: 20rpx;
	}

	.advice-list {
		display: flex;
		flex-direction: column;
		gap: 14rpx;
	}

	.advice {
		background: #fff;
		border-radius: 18rpx;
		padding: 20rpx 18rpx;
		box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.05);
	}

	.advice--warn {
		border-color: rgba(239, 68, 68, 0.25);
		background: linear-gradient(180deg, #fff, #fff7f7);
	}

	.advice--good {
		border-color: rgba(34, 197, 94, 0.25);
		background: linear-gradient(180deg, #fff, #f7fff8);
	}

	.advice--info {
		border-color: rgba(30, 128, 255, 0.18);
		background: linear-gradient(180deg, #fff, #f8fbff);
	}

	.advice__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16rpx;
	}

	.advice__title {
		font-size: 28rpx;
		font-weight: 900;
		color: #111827;
	}

	.advice__tag {
		padding: 6rpx 14rpx;
		border-radius: 999px;
		background: rgba(30, 128, 255, 0.12);
		color: #1e80ff;
		font-size: 20rpx;
		font-weight: 800;
		white-space: nowrap;
	}

	.advice--warn .advice__tag {
		background: rgba(239, 68, 68, 0.12);
		color: #ef4444;
	}

	.advice--good .advice__tag {
		background: rgba(34, 197, 94, 0.12);
		color: #16a34a;
	}

	.advice__text {
		margin-top: 10rpx;
		font-size: 24rpx;
		color: #374151;
		line-height: 1.55;
	}

	.advice__actions {
		margin-top: 14rpx;
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
	}

	.advice__btn {
		background: #1e80ff;
		color: #fff;
		border-radius: 999px;
		padding: 0 18rpx;
		font-weight: 800;
	}

	.achievement-strip {
		display: flex;
		flex-direction: column;
		gap: 12rpx;
	}

	.achievement-chip {
		display: flex;
		align-items: center;
		gap: 14rpx;
		padding: 18rpx 18rpx;
		background: #fff;
		border-radius: 16rpx;
		box-shadow: 0 8rpx 28rpx rgba(15, 23, 42, 0.05);
	}

	.achievement-chip__icon {
		font-size: 36rpx;
		line-height: 1;
	}

	.achievement-chip__main {
		flex: 1;
		min-width: 0;
	}

	.achievement-chip__title {
		font-size: 26rpx;
		font-weight: 800;
		color: #111827;
	}

	.achievement-chip__sub {
		margin-top: 6rpx;
		font-size: 22rpx;
		color: #6b7280;
	}

	.section__title {
		font-size: 28rpx;
		color: #111827;
		font-weight: 700;
		margin: 10rpx 0;
	}

	.empty {
		background: #fff;
		border-radius: 16rpx;
		padding: 36rpx 28rpx;
		color: #6b7280;
		text-align: center;
	}

	.empty__illus {
		font-size: 64rpx;
		line-height: 1;
		margin-bottom: 14rpx;
	}

	.empty__title {
		font-size: 30rpx;
		font-weight: 700;
		color: #374151;
		margin-bottom: 10rpx;
	}

	.empty__tips {
		font-size: 24rpx;
		line-height: 1.55;
		margin-bottom: 24rpx;
	}

	.empty__btn {
		background: #1e80ff;
		color: #fff;
		border-radius: 999px;
		font-weight: 700;
		font-size: 28rpx;
		padding: 0 40rpx;
		display: inline-flex;
	}

	.list {
		background: #fff;
		border-radius: 16rpx;
		overflow: hidden;
	}

	.cell {
		display: flex;
		align-items: center;
		padding: 22rpx 20rpx;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	}

	.cell:last-child {
		border-bottom: none;
	}

	.cell__main {
		flex: 1;
	}

	.cell__title {
		font-size: 30rpx;
		font-weight: 700;
		color: #111827;
	}

	.cell__sub {
		margin-top: 6rpx;
		font-size: 24rpx;
		color: #6b7280;
	}

	.cell__arrow {
		color: #9ca3af;
		font-size: 36rpx;
		padding-left: 10rpx;
	}

	.plan {
		background: #fff;
		border-radius: 16rpx;
		padding: 18rpx 16rpx;
	}

	.plan__top {
		display: flex;
		flex-direction: column;
		gap: 6rpx;
		margin-bottom: 10rpx;
	}

	.plan__progress {
		font-size: 26rpx;
		color: #111827;
		font-weight: 700;
	}

	.plan__next {
		font-size: 24rpx;
		color: #6b7280;
	}

	.plan__bar {
		height: 10px;
		border-radius: 999px;
		background: rgba(30, 128, 255, 0.12);
		overflow: hidden;
	}

	.plan__barFill {
		height: 100%;
		border-radius: 999px;
		background: #1e80ff;
	}
</style>
