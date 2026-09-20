<template>
	<view class="page">
		<view class="header">
			<view class="header__title">运动记录</view>
			<button class="add-btn" size="mini" @tap="goAdd">+ 新增</button>
		</view>

		<view class="search-bar">
			<text class="search-bar__icon">⌕</text>
			<input
				class="search-bar__inp"
				v-model="keyword"
				confirm-type="search"
				placeholder="搜索类型、备注、跑鞋…"
				@confirm="blurSearch"
			/>
			<text v-if="keyword" class="search-bar__clear" @tap="keyword = ''">清除</text>
		</view>

		<view v-if="records.length === 0" class="empty">
			<view class="empty__illus">🏃</view>
			<view class="empty__title">还没有运动记录</view>
			<view class="empty__tips">在页面顶部下拉可刷新；向左滑动一条记录可露出删除。</view>
			<button class="empty__btn" @tap="goAdd">记第一条</button>
		</view>

		<view v-else-if="filteredRecords.length === 0" class="empty empty--soft">
			<view class="empty__title">没有匹配「{{ keyword }}」的记录</view>
			<text class="empty__link" @tap="keyword = ''">清空筛选</text>
		</view>

		<view v-else>
			<view v-for="group in groupedRecords" :key="group.label" class="group">
				<view class="group__header">
					<text class="group__label">{{ group.label }}</text>
					<text class="group__count">{{ group.records.length }} 条</text>
				</view>
				<uni-swipe-action class="swipe-wrap">
					<uni-swipe-action-item
						v-for="r in group.records"
						:key="r.id"
						:right-options="swipeDeleteOptions"
						@click="onSwipeClick($event, r.id)"
					>
						<view class="row" @tap="goEdit(r.id)">
							<view class="row__main">
								<view class="row__head">
									<image
										v-if="r.checkInImage"
										class="row__thumb"
										:src="r.checkInImage"
										mode="aspectFill"
										@tap.stop="previewThumb(r.checkInImage)"
									/>
									<view class="row__title">{{ r.type }}</view>
								</view>
								<view class="row__sub">
									{{ toLocalTime(r.startAt) }} · {{ r.durationMin }} 分钟
									<text v-if="r.distanceKm != null"> · {{ formatNumber(r.distanceKm) }} 公里</text>
									<text v-if="r.calories != null"> · {{ r.calories }} 千卡</text>
								</view>
								<view v-if="r.note" class="row__note">{{ r.note }}</view>
							</view>
							<text class="row__chev">›</text>
						</view>
					</uni-swipe-action-item>
				</uni-swipe-action>
			</view>
		</view>
	</view>
</template>

<script>
	import { mapGetters } from 'vuex'
	import { feedbackSuccess } from '@/utils/uiFeedback.js'
	import { isLoggedIn } from '@/utils/authSession.js'
	import { deleteSportRecord } from '@/utils/socialApi.js'

	export default {
		data() {
			return {
				keyword: '',
				swipeDeleteOptions: [
					{
						text: '删除',
						style: { backgroundColor: '#ef4444' }
					}
				]
			}
		},
		computed: {
			...mapGetters(['recordsSorted']),
			records() {
				return this.recordsSorted || []
			},
			filteredRecords() {
				const list = this.records
				const q = (this.keyword || '').trim().toLowerCase()
				if (!q) return list
				return list.filter((r) => {
					const hay = [r.type, r.note, r.runSubtype, r.shoes, String(r.durationMin)]
						.filter((x) => x != null && String(x) !== '')
						.join(' ')
						.toLowerCase()
					return hay.indexOf(q) !== -1
				})
			},
			groupedRecords() {
				const now = new Date()
				const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
				const yesterdayStart = todayStart - 86400000
				const weekStart = todayStart - 6 * 86400000

				const groups = []
				const groupMap = {}

				const getLabel = (iso) => {
					const t = new Date(iso).getTime()
					if (t >= todayStart) return '今天'
					if (t >= yesterdayStart) return '昨天'
					if (t >= weekStart) return '近7天'
					const d = new Date(iso)
					const yyyy = d.getFullYear()
					const mm = String(d.getMonth() + 1).padStart(2, '0')
					return `${yyyy}年${mm}月`
				}

				for (const r of this.filteredRecords) {
					const label = getLabel(r.startAt)
					if (!groupMap[label]) {
						groupMap[label] = { label, records: [] }
						groups.push(groupMap[label])
					}
					groupMap[label].records.push(r)
				}

				return groups
			}
		},
		onShow() {
			const tab = this.getTabBar && this.getTabBar()
			if (tab && tab.setActive) tab.setActive('pages/record/index')
		},
		onPullDownRefresh() {
			setTimeout(() => {
				try {
					uni.stopPullDownRefresh()
				} catch (e) {}
				uni.showToast({ title: '列表已更新', icon: 'none', duration: 1200 })
			}, 280)
		},
		methods: {
			blurSearch() {
				try {
					uni.hideKeyboard()
				} catch (e) {}
			},
			goAdd() {
				uni.navigateTo({ url: '/pages/record/edit' })
			},
			goEdit(id) {
				uni.navigateTo({ url: `/pages/record/edit?id=${encodeURIComponent(id)}` })
			},
			onSwipeClick(e, id) {
				const text = e && e.content && e.content.text
				if (text === '删除') this.confirmDelete(id)
			},
			confirmDelete(id) {
				uni.showModal({
					title: '删除记录',
					content: '确定要删除这条运动记录吗？删除后无法恢复。',
					confirmColor: '#ef4444',
					success: (res) => {
						if (!res.confirm) return
						this.$store.commit('deleteRecord', id)
						if (isLoggedIn() && id) {
							deleteSportRecord(id).catch(() => {})
						}
						feedbackSuccess('已删除')
					}
				})
			},
			toLocalTime(iso) {
				const d = new Date(iso)
				const yyyy = d.getFullYear()
				const mm = String(d.getMonth() + 1).padStart(2, '0')
				const dd = String(d.getDate()).padStart(2, '0')
				const hh = String(d.getHours()).padStart(2, '0')
				const mi = String(d.getMinutes()).padStart(2, '0')
				return `${yyyy}-${mm}-${dd} ${hh}:${mi}`
			},
			formatNumber(n) {
				if (n == null || Number.isNaN(Number(n))) return '0'
				const v = Number(n)
				return v % 1 === 0 ? String(v) : v.toFixed(2)
			},
			previewThumb(src) {
				if (!src) return
				uni.previewImage({ urls: [src] })
			}
		}
	}
</script>

<style lang="scss">
	.page {
		padding: 24rpx 24rpx calc(24rpx + 60px) 24rpx;
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 14rpx;
	}

	.header__title {
		font-size: 34rpx;
		font-weight: 800;
		color: #111827;
	}

	.add-btn {
		background: #1e80ff;
		color: #fff;
		border-radius: 999px;
		padding: 0 18rpx;
	}

	.search-bar {
		display: flex;
		align-items: center;
		gap: 12rpx;
		background: #fff;
		border-radius: 999px;
		padding: 14rpx 22rpx;
		margin-bottom: 18rpx;
		border: 1px solid rgba(0, 0, 0, 0.06);
	}

	.search-bar__icon {
		font-size: 28rpx;
		color: #9ca3af;
	}

	.search-bar__inp {
		flex: 1;
		font-size: 28rpx;
		color: #111827;
	}

	.search-bar__clear {
		font-size: 24rpx;
		color: #1e80ff;
		flex-shrink: 0;
	}

	.empty {
		background: #fff;
		border-radius: 16rpx;
		padding: 48rpx 28rpx;
		color: #6b7280;
		text-align: center;
	}

	.empty--soft {
		padding: 36rpx 24rpx;
	}

	.empty__illus {
		font-size: 72rpx;
		line-height: 1;
		margin-bottom: 16rpx;
	}

	.empty__title {
		font-size: 30rpx;
		font-weight: 700;
		color: #374151;
		margin-bottom: 12rpx;
	}

	.empty__tips {
		font-size: 24rpx;
		line-height: 1.5;
		margin-bottom: 28rpx;
	}

	.empty__btn {
		background: #1e80ff;
		color: #fff;
		border-radius: 999px;
		font-weight: 700;
		padding: 0 48rpx;
		display: inline-flex;
	}

	.empty__link {
		color: #1e80ff;
		font-size: 26rpx;
		margin-left: 8rpx;
	}

	.group {
		margin-bottom: 20rpx;
	}

	.group__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 4rpx 10rpx 4rpx;
	}

	.group__label {
		font-size: 26rpx;
		font-weight: 800;
		color: #374151;
	}

	.group__count {
		font-size: 22rpx;
		color: #9ca3af;
	}

	.swipe-wrap {
		background: #fff;
		border-radius: 16rpx;
		overflow: hidden;
	}

	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12rpx;
		padding: 22rpx 20rpx;
		border-bottom: 1px solid rgba(0, 0, 0, 0.06);
		background: #fff;
	}

	.uni-swipe-action-item:last-child .row {
		border-bottom: none;
	}

	.row__main {
		flex: 1;
		min-width: 0;
	}

	.row__head {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}

	.row__thumb {
		width: 88rpx;
		height: 88rpx;
		border-radius: 12rpx;
		background: #f3f4f6;
		flex-shrink: 0;
	}

	.row__title {
		font-size: 30rpx;
		font-weight: 800;
		color: #111827;
	}

	.row__sub {
		margin-top: 6rpx;
		font-size: 24rpx;
		color: #6b7280;
	}

	.row__note {
		margin-top: 8rpx;
		font-size: 24rpx;
		color: #374151;
	}

	.row__chev {
		flex-shrink: 0;
		font-size: 36rpx;
		color: #d1d5db;
		line-height: 1;
		padding-left: 8rpx;
	}
</style>
