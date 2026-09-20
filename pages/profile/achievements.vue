<template>
	<view class="page">
		<view class="hero">
			<view class="hero__title">成就中心</view>
			<view class="hero__sub">已解锁 {{ unlockedCount }}/{{ totalCount }}，完成度 {{ completionPercent }}%</view>
			<view class="hero__stats">
				<view class="hero__metric">
					<view class="hero__metricValue">{{ stats.records }}</view>
					<view class="hero__metricLabel">累计记录</view>
				</view>
				<view class="hero__metric">
					<view class="hero__metricValue">{{ stats.bestStreakDays }}</view>
					<view class="hero__metricLabel">最佳连击</view>
				</view>
				<view class="hero__metric">
					<view class="hero__metricValue">{{ stats.totalMinutes }}</view>
					<view class="hero__metricLabel">累计分钟</view>
				</view>
			</view>
			<view class="progress">
				<view class="progress__fill" :style="{ width: `${completionPercent}%` }"></view>
			</view>
		</view>

		<view class="section">
			<view class="section__title">已解锁</view>
			<view v-if="unlockedList.length" class="list">
				<view v-for="item in unlockedList" :key="item.id" class="item item--unlocked">
					<view class="item__icon">{{ item.icon }}</view>
					<view class="item__main">
						<view class="item__head">
							<text class="item__title">{{ item.title }}</text>
							<text class="item__tag">{{ item.category }}</text>
						</view>
						<view class="item__desc">{{ item.description }}</view>
						<view class="item__meta">解锁时间：{{ item.unlockedDateText }}</view>
					</view>
				</view>
			</view>
			<view v-else class="empty">还没有已解锁成就，先去记录一条运动吧。</view>
		</view>

		<view class="section">
			<view class="section__title">待解锁</view>
			<view v-if="lockedList.length" class="list">
				<view v-for="item in lockedList" :key="item.id" class="item item--locked">
					<view class="item__icon">{{ item.icon }}</view>
					<view class="item__main">
						<view class="item__head">
							<text class="item__title">{{ item.title }}</text>
							<text class="item__tag item__tag--soft">{{ item.category }}</text>
						</view>
						<view class="item__desc">{{ item.description }}</view>
						<view class="item__meta">进度 {{ formatProgress(item) }}</view>
						<view class="item__progress">
							<view class="item__progressFill" :style="{ width: `${item.progressPercent}%` }"></view>
						</view>
					</view>
				</view>
			</view>
			<view v-else class="empty">所有基础成就都已解锁，太厉害了。</view>
		</view>
	</view>
</template>

<script>
	import { mapGetters } from 'vuex'

	export default {
		computed: {
			...mapGetters(['achievementSnapshot']),
			stats() {
				return (this.achievementSnapshot && this.achievementSnapshot.stats) || {
					records: 0,
					bestStreakDays: 0,
					totalMinutes: 0
				}
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
			unlockedList() {
				return (this.achievementSnapshot && this.achievementSnapshot.unlockedList) || []
			},
			lockedList() {
				return (this.achievementSnapshot && this.achievementSnapshot.lockedList) || []
			}
		},
		methods: {
			formatProgress(item) {
				const current = item.metric === 'runDistance' ? this.formatNumber(item.current) : item.current
				const target = item.metric === 'runDistance' ? this.formatNumber(item.target) : item.target
				return `${current}/${target}`
			},
			formatNumber(n) {
				if (n == null || Number.isNaN(Number(n))) return '0'
				const v = Number(n)
				return v % 1 === 0 ? String(v) : v.toFixed(2)
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 24rpx;
	}

	.hero {
		background: linear-gradient(180deg, #1e80ff, #4da3ff);
		border-radius: 20rpx;
		padding: 28rpx 24rpx;
		color: #fff;
	}

	.hero__title {
		font-size: 36rpx;
		font-weight: 900;
	}

	.hero__sub {
		margin-top: 8rpx;
		font-size: 24rpx;
		opacity: 0.95;
	}

	.hero__stats {
		display: flex;
		gap: 14rpx;
		margin-top: 18rpx;
	}

	.hero__metric {
		flex: 1;
		background: rgba(255, 255, 255, 0.14);
		border-radius: 16rpx;
		padding: 18rpx 14rpx;
	}

	.hero__metricValue {
		font-size: 34rpx;
		font-weight: 900;
	}

	.hero__metricLabel {
		margin-top: 8rpx;
		font-size: 22rpx;
		opacity: 0.92;
	}

	.progress {
		height: 14rpx;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 999px;
		overflow: hidden;
		margin-top: 18rpx;
	}

	.progress__fill {
		height: 100%;
		background: #fff;
		border-radius: 999px;
	}

	.section {
		margin-top: 22rpx;
	}

	.section__title {
		font-size: 28rpx;
		font-weight: 800;
		color: #111827;
		margin-bottom: 12rpx;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 14rpx;
	}

	.item {
		display: flex;
		gap: 16rpx;
		background: #fff;
		border-radius: 18rpx;
		padding: 22rpx 20rpx;
		box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.05);
	}

	.item--locked {
		opacity: 0.9;
	}

	.item__icon {
		font-size: 40rpx;
		line-height: 1;
		width: 52rpx;
		text-align: center;
	}

	.item__main {
		flex: 1;
		min-width: 0;
	}

	.item__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12rpx;
	}

	.item__title {
		font-size: 28rpx;
		font-weight: 800;
		color: #111827;
	}

	.item__tag {
		padding: 6rpx 14rpx;
		border-radius: 999px;
		background: rgba(30, 128, 255, 0.12);
		color: #1e80ff;
		font-size: 20rpx;
		font-weight: 700;
		white-space: nowrap;
	}

	.item__tag--soft {
		background: #f3f4f6;
		color: #6b7280;
	}

	.item__desc {
		margin-top: 8rpx;
		font-size: 24rpx;
		color: #4b5563;
		line-height: 1.5;
	}

	.item__meta {
		margin-top: 10rpx;
		font-size: 22rpx;
		color: #6b7280;
	}

	.item__progress {
		height: 10rpx;
		background: #eef2ff;
		border-radius: 999px;
		overflow: hidden;
		margin-top: 10rpx;
	}

	.item__progressFill {
		height: 100%;
		background: linear-gradient(90deg, #1e80ff, #60a5fa);
		border-radius: 999px;
	}

	.empty {
		background: #fff;
		border-radius: 18rpx;
		padding: 32rpx 24rpx;
		font-size: 24rpx;
		color: #6b7280;
		text-align: center;
	}
</style>
