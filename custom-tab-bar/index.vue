<template>
	<view class="tabbar">
		<view class="tabbar__inner">
			<view
				v-for="item in tabs"
				:key="item.pagePath"
				class="tabbar__item"
				:class="{ 'is-active': item.pagePath === activePath }"
				@tap="switchTab(item.pagePath)"
			>
				<text class="tabbar__icon">{{ item.icon }}</text>
				<text class="tabbar__text">{{ item.text }}</text>
			</view>
		</view>
	</view>
</template>

<script>
	// 微信小程序 custom-tab-bar 是独立组件，easycom 里的 uni-icons 往往加载失败，导致底部空白
	const DEFAULT_TABS = [
		{ pagePath: 'pages/home/index', text: '首页', icon: '⌂' },
		{ pagePath: 'pages/record/index', text: '记录', icon: '✎' },
		{ pagePath: 'pages/stats/index', text: '统计', icon: '▦' },
		{ pagePath: 'pages/profile/index', text: '我的', icon: '☺' }
	]

	export default {
		data() {
			return {
				tabs: DEFAULT_TABS,
				activePath: 'pages/home/index',
				color: '#6b7280',
				activeColor: '#1e80ff'
			}
		},
		mounted() {
			this.syncActiveFromRoute()
		},
		methods: {
			syncActiveFromRoute() {
				const pages = getCurrentPages()
				const page = pages[pages.length - 1]
				if (page && page.route) {
					this.activePath = page.route
				}
			},
			setActive(pagePath) {
				if (!pagePath) return
				this.activePath = pagePath
			},
			switchTab(pagePath) {
				if (!pagePath || pagePath === this.activePath) return
				this.activePath = pagePath
				uni.switchTab({ url: `/${pagePath}` })
			}
		}
	}
</script>

<style lang="scss">
	.tabbar {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		padding-bottom: env(safe-area-inset-bottom);
		background: #fff;
		border-top: 1px solid rgba(0, 0, 0, 0.06);
		z-index: 999;
	}

	.tabbar__inner {
		display: flex;
		height: 52px;
		align-items: center;
	}

	.tabbar__item {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 6px 0;
	}

	.tabbar__icon {
		font-size: 20px;
		line-height: 1;
		color: #6b7280;
	}

	.tabbar__text {
		margin-top: 2px;
		font-size: 11px;
		color: #6b7280;
	}

	.tabbar__item.is-active .tabbar__icon,
	.tabbar__item.is-active .tabbar__text {
		color: #1e80ff;
		font-weight: 600;
	}
</style>
