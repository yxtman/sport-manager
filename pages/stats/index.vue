<template>
	<view class="page">
		<view class="toolbar">
			<view class="toolbar__group">
				<view
					v-for="r in rangeOptions"
					:key="r.key"
					class="seg"
					:class="{ 'seg--on': rangeKey === r.key }"
					@tap="rangeKey = r.key"
				>
					{{ r.label }}
				</view>
			</view>
			<scroll-view scroll-x class="type-scroll" :show-scrollbar="false">
				<view class="type-row">
					<view
						v-for="t in typeFilters"
						:key="t"
						class="type-chip"
						:class="{ 'type-chip--on': typeFilter === t }"
						@tap="typeFilter = t"
					>
						{{ t }}
					</view>
				</view>
			</scroll-view>
		</view>

		<view class="card hero-card">
			<view class="card__head">
				<view class="card__title">{{ rangeTitle }}</view>
				<view class="card__badge" v-if="typeFilter !== '全部'">{{ typeFilter }}</view>
			</view>
			<view class="grid grid--4">
				<view class="metric">
					<view class="metric__value">{{ summary.sessions }}</view>
					<view class="metric__label">次数</view>
				</view>
				<view class="metric">
					<view class="metric__value">{{ summary.minutes }}</view>
					<view class="metric__label">分钟</view>
				</view>
				<view class="metric">
					<view class="metric__value">{{ formatNumber(summary.distanceKm) }}</view>
					<view class="metric__label">公里</view>
				</view>
				<view class="metric">
					<view class="metric__value">{{ summary.calories }}</view>
					<view class="metric__label">千卡</view>
				</view>
			</view>

			<view class="pace-row" v-if="summary.averagePaceSec">
				<text class="pace-row__label">跑步平均配速</text>
				<text class="pace-row__value">{{ averagePaceText }}</text>
			</view>

			<view class="progress" v-if="showGoalProgress">
				<view class="progress__row">
					<text class="progress__label">{{ goalLabel }}</text>
					<text class="progress__value">{{ goalProgress.goalMinutes }} 分钟</text>
				</view>
				<view class="bar">
					<view class="bar__fill" :style="{ width: `${goalProgress.progressPercent}%` }"></view>
				</view>
				<view class="progress__hint">已完成 {{ goalProgress.progressPercent }}%</view>
			</view>
		</view>

		<view class="section-gap">
			<stats-chart
				canvas-id="canvasStatsTrend"
				:chart-type="trendChart.chartType"
				:title="trendTitle"
				:categories="trendChart.categories"
				:series="trendChart.series"
				:has-data="trendChart.hasData"
				:enable-scroll="trendChart.enableScroll"
				:y-max="trendYMax"
			/>
		</view>

		<view class="section-gap" v-if="showTypeChart">
			<stats-chart
				canvas-id="canvasStatsType"
				chart-type="ring"
				:title="typeChartTitle"
				:series="typeDistribution.series"
				:has-data="typeDistribution.hasData"
			/>
			<view v-if="typeDistribution.hasData" class="type-legend">
				<view v-for="item in typeDistribution.series" :key="item.name" class="type-legend__item">
					<view class="type-legend__dot" :style="{ background: item.color }"></view>
					<text class="type-legend__name">{{ item.name }}</text>
					<text class="type-legend__val">{{ item.data }} 分</text>
					<text class="type-legend__pct">{{ typePercent(item.data) }}%</text>
				</view>
			</view>
		</view>

		<view class="section">
			<view class="section__title">{{ detailTitle }}</view>
			<view v-if="detailRows.length === 0" class="empty-box">当前筛选条件下暂无记录</view>
			<view v-else class="list">
				<view v-for="d in detailRows" :key="d.key" class="row">
					<text class="row__date">{{ d.label }}</text>
					<view class="row__right">
						<view class="row__bar">
							<view class="row__barFill" :style="{ width: `${d.p}%`, background: detailBarColor }"></view>
						</view>
						<text class="row__min">{{ d.minutes }} 分钟</text>
					</view>
				</view>
			</view>
		</view>

		<view class="section" v-if="paceZones.totalMinutes">
			<view class="section__title">配速区间（{{ rangeShortLabel }} · 跑步）</view>
			<view class="list">
				<view v-for="z in paceZones.items" :key="z.name" class="row">
					<text class="row__date row__date--wide">{{ z.name }}</text>
					<view class="row__right">
						<view class="row__bar">
							<view class="row__barFill" :style="{ width: `${z.p}%` }"></view>
						</view>
						<text class="row__min">{{ z.minutes }} 分钟</text>
					</view>
				</view>
			</view>
		</view>

		<view class="section" v-if="hrZones.totalMinutes">
			<view class="section__title">心率区间（{{ rangeShortLabel }} · 跑步）</view>
			<view class="list">
				<view v-for="z in hrZones.items" :key="z.name" class="row">
					<text class="row__date row__date--wide">{{ z.name }}</text>
					<view class="row__right">
						<view class="row__bar">
							<view class="row__barFill" :style="{ width: `${z.p}%` }"></view>
						</view>
						<text class="row__min">{{ z.minutes }} 分钟</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapState, mapGetters } from 'vuex'
	import StatsChart from '@/components/stats-chart/stats-chart.vue'
	import {
		SPORT_TYPE_FILTERS,
		RANGE_OPTIONS,
		TYPE_COLORS,
		getRangeMeta,
		filterRecordsByRange,
		computeSummary,
		computeDailyRows,
		computeMonthlyRows,
		buildTrendChartData,
		buildTypeDistribution,
		computeGoalProgress,
		computePaceZones,
		computeHrZones,
		formatPace
	} from '@/utils/statsAnalytics.js'

	export default {
		components: {
			StatsChart
		},
		data() {
			return {
				rangeKey: 'week',
				typeFilter: '全部',
				rangeOptions: RANGE_OPTIONS,
				typeFilters: SPORT_TYPE_FILTERS
			}
		},
		computed: {
			...mapState(['records', 'settings']),
			...mapGetters(['effectiveMaxHr']),
			rangeMeta() {
				return getRangeMeta(this.rangeKey)
			},
			rangeTitle() {
				const typeText = this.typeFilter === '全部' ? '' : ` · ${this.typeFilter}`
				return `${this.rangeMeta.title}${typeText}`
			},
			rangeShortLabel() {
				return RANGE_OPTIONS.find((r) => r.key === this.rangeKey)?.label || '7天'
			},
			filteredRecords() {
				return filterRecordsByRange(this.records, this.rangeKey, this.typeFilter)
			},
			summary() {
				return computeSummary(this.filteredRecords)
			},
			averagePaceText() {
				return formatPace(this.summary.averagePaceSec)
			},
			goalMinutesSetting() {
				const v =
					this.settings && this.settings.weeklyMinutesGoal != null ? Number(this.settings.weeklyMinutesGoal) : 150
				return Number.isFinite(v) && v > 0 ? Math.round(v) : 150
			},
			showGoalProgress() {
				return this.rangeKey === 'week' && (this.typeFilter === '全部' || this.typeFilter === '跑步')
			},
			goalLabel() {
				return this.typeFilter === '跑步' ? '本周跑步目标' : '本周运动目标'
			},
			goalProgress() {
				const minutes =
					this.typeFilter === '跑步'
						? computeSummary(filterRecordsByRange(this.records, 'week', '跑步')).minutes
						: computeSummary(filterRecordsByRange(this.records, 'week', '全部')).minutes
				return computeGoalProgress(minutes, this.goalMinutesSetting)
			},
			trendChart() {
				return buildTrendChartData(this.records, this.rangeKey, this.typeFilter)
			},
			trendTitle() {
				return this.rangeMeta.trendTitle
			},
			trendYMax() {
				const values = (this.trendChart.series[0]?.data || []).map((v) => Number(v) || 0)
				const maxVal = values.length ? Math.max(...values) : 10
				return Math.max(10, Math.ceil(maxVal * 1.2))
			},
			showTypeChart() {
				return this.typeFilter === '全部'
			},
			typeChartTitle() {
				return `${this.rangeShortLabel}运动类型占比`
			},
			typeDistribution() {
				return buildTypeDistribution(this.records, this.rangeKey)
			},
			detailTitle() {
				return this.rangeKey === 'year' ? '每月运动分钟' : '每日运动分钟'
			},
			detailRows() {
				const rows =
					this.rangeKey === 'year'
						? computeMonthlyRows(this.records, this.rangeKey, this.typeFilter)
						: computeDailyRows(this.records, this.rangeKey, this.typeFilter)
				return rows.map((r) => ({
					key: r.ymd || `${r.month}-${r.label}`,
					label: r.label,
					minutes: r.minutes,
					p: r.p
				}))
			},
			detailBarColor() {
				if (this.typeFilter === '全部') return '#1e80ff'
				return TYPE_COLORS[this.typeFilter] || '#1e80ff'
			},
			paceZones() {
				return computePaceZones(this.records, this.rangeKey, this.typeFilter)
			},
			hrZones() {
				return computeHrZones(this.records, this.rangeKey, this.effectiveMaxHr, this.typeFilter)
			}
		},
		onShow() {
			const tab = this.getTabBar && this.getTabBar()
			if (tab && tab.setActive) tab.setActive('pages/stats/index')
		},
		onPullDownRefresh() {
			setTimeout(() => {
				try {
					uni.stopPullDownRefresh()
				} catch (e) {}
				uni.showToast({ title: '统计已更新', icon: 'none', duration: 1200 })
			}, 280)
		},
		methods: {
			formatNumber(n) {
				if (n == null || Number.isNaN(Number(n))) return '0'
				const v = Number(n)
				return v % 1 === 0 ? String(v) : v.toFixed(2)
			},
			typePercent(minutes) {
				const total = this.typeDistribution.totalMinutes || 0
				if (!total) return 0
				return Math.round((minutes / total) * 100)
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 24rpx 24rpx calc(24rpx + 60px) 24rpx;
	}

	.toolbar {
		margin-bottom: 18rpx;
	}

	.toolbar__group {
		display: flex;
		background: #fff;
		border-radius: 999px;
		padding: 6rpx;
		box-shadow: 0 8rpx 24rpx rgba(17, 24, 39, 0.06);
	}

	.seg {
		flex: 1;
		text-align: center;
		padding: 16rpx 0;
		font-size: 26rpx;
		color: #6b7280;
		border-radius: 999px;
	}

	.seg--on {
		background: #1e80ff;
		color: #fff;
		font-weight: 700;
	}

	.type-scroll {
		margin-top: 16rpx;
		white-space: nowrap;
	}

	.type-row {
		display: inline-flex;
		gap: 12rpx;
		padding-bottom: 4rpx;
	}

	.type-chip {
		padding: 12rpx 22rpx;
		border-radius: 999px;
		background: #fff;
		color: #374151;
		font-size: 24rpx;
		border: 1px solid rgba(17, 24, 39, 0.08);
	}

	.type-chip--on {
		background: rgba(30, 128, 255, 0.12);
		color: #1e80ff;
		border-color: rgba(30, 128, 255, 0.35);
		font-weight: 700;
	}

	.card,
	.hero-card {
		background: #fff;
		border-radius: 16rpx;
		padding: 22rpx 20rpx;
		box-shadow: 0 10rpx 30rpx rgba(30, 128, 255, 0.08);
	}

	.card__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12rpx;
	}

	.card__title {
		font-size: 30rpx;
		font-weight: 800;
		color: #111827;
	}

	.card__badge {
		font-size: 22rpx;
		color: #1e80ff;
		background: rgba(30, 128, 255, 0.1);
		padding: 6rpx 14rpx;
		border-radius: 999px;
	}

	.grid {
		display: flex;
		margin-top: 16rpx;
	}

	.grid--4 .metric {
		flex: 1;
	}

	.metric__value {
		font-size: 34rpx;
		font-weight: 900;
		color: #111827;
	}

	.metric__label {
		font-size: 22rpx;
		color: #6b7280;
		margin-top: 6rpx;
	}

	.pace-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 18rpx;
		padding-top: 16rpx;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
	}

	.pace-row__label {
		color: #374151;
		font-size: 24rpx;
	}

	.pace-row__value {
		color: #1e80ff;
		font-size: 26rpx;
		font-weight: 800;
	}

	.progress {
		margin-top: 18rpx;
	}

	.progress__row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.progress__label {
		color: #374151;
		font-size: 24rpx;
	}

	.progress__value {
		color: #111827;
		font-size: 24rpx;
		font-weight: 700;
	}

	.bar {
		height: 10px;
		background: rgba(30, 128, 255, 0.12);
		border-radius: 999px;
		overflow: hidden;
		margin-top: 10rpx;
	}

	.bar__fill {
		height: 100%;
		background: linear-gradient(90deg, #1e80ff, #38bdf8);
		border-radius: 999px;
	}

	.progress__hint {
		margin-top: 10rpx;
		font-size: 24rpx;
		color: #6b7280;
	}

	.section-gap {
		margin-top: 20rpx;
	}

	.type-legend {
		margin-top: 12rpx;
		background: #fff;
		border-radius: 16rpx;
		padding: 8rpx 18rpx 14rpx;
	}

	.type-legend__item {
		display: flex;
		align-items: center;
		padding: 12rpx 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.05);
	}

	.type-legend__item:last-child {
		border-bottom: none;
	}

	.type-legend__dot {
		width: 16rpx;
		height: 16rpx;
		border-radius: 50%;
		margin-right: 12rpx;
	}

	.type-legend__name {
		flex: 1;
		font-size: 24rpx;
		color: #374151;
	}

	.type-legend__val {
		font-size: 24rpx;
		color: #111827;
		font-weight: 700;
		margin-right: 16rpx;
	}

	.type-legend__pct {
		width: 72rpx;
		text-align: right;
		font-size: 22rpx;
		color: #6b7280;
	}

	.section {
		margin-top: 20rpx;
	}

	.section__title {
		font-size: 28rpx;
		color: #111827;
		font-weight: 800;
		margin: 10rpx 0;
	}

	.empty-box {
		background: #fff;
		border-radius: 16rpx;
		padding: 36rpx 24rpx;
		text-align: center;
		color: #9ca3af;
		font-size: 24rpx;
	}

	.list {
		background: #fff;
		border-radius: 16rpx;
		overflow: hidden;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 18rpx 18rpx;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
	}

	.row:last-child {
		border-bottom: none;
	}

	.row__date {
		color: #374151;
		font-size: 24rpx;
		width: 120rpx;
	}

	.row__date--wide {
		width: 320rpx;
		line-height: 1.4;
	}

	.row__right {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 14rpx;
	}

	.row__bar {
		flex: 1;
		height: 8px;
		background: rgba(17, 24, 39, 0.08);
		border-radius: 999px;
		overflow: hidden;
	}

	.row__barFill {
		height: 100%;
		background: #1e80ff;
		border-radius: 999px;
	}

	.row__min {
		width: 160rpx;
		text-align: right;
		color: #111827;
		font-size: 24rpx;
		font-weight: 700;
	}
</style>
