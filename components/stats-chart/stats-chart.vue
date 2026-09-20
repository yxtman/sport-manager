<template>
	<view class="stats-chart">
		<view v-if="title" class="stats-chart__title">{{ title }}</view>
		<view v-if="!hasData" class="stats-chart__empty">{{ emptyText }}</view>
		<view v-else class="stats-chart__box">
			<!-- #ifdef MP-ALIPAY -->
			<canvas
				:canvas-id="canvasId"
				:id="canvasId"
				class="stats-chart__canvas"
				:width="cWidth * pixelRatio"
				:height="cHeight * pixelRatio"
				:style="{ width: cWidth + 'px', height: cHeight + 'px' }"
				:disable-scroll="enableScroll"
				@touchstart="touchStart"
				@touchmove="touchMove"
				@touchend="touchEnd"
			></canvas>
			<!-- #endif -->
			<!-- #ifndef MP-ALIPAY -->
			<canvas
				:canvas-id="canvasId"
				:id="canvasId"
				class="stats-chart__canvas"
				:disable-scroll="enableScroll"
				@touchstart="touchStart"
				@touchmove="touchMove"
				@touchend="touchEnd"
			></canvas>
			<!-- #endif -->
		</view>
	</view>
</template>

<script>
	import uCharts from '@/components/u-charts/u-charts.js'

	const chartMap = {}

	export default {
		name: 'StatsChart',
		props: {
			canvasId: {
				type: String,
				required: true
			},
			chartType: {
				type: String,
				default: 'area'
			},
			title: {
				type: String,
				default: ''
			},
			categories: {
				type: Array,
				default: () => []
			},
			series: {
				type: Array,
				default: () => []
			},
			hasData: {
				type: Boolean,
				default: false
			},
			emptyText: {
				type: String,
				default: '暂无数据，先去记录一次运动吧'
			},
			enableScroll: {
				type: Boolean,
				default: false
			},
			yMax: {
				type: Number,
				default: 0
			}
		},
		data() {
			return {
				cWidth: 0,
				cHeight: 0,
				pixelRatio: 1,
				ready: false
			}
		},
		mounted() {
			this.initCanvas()
		},
		watch: {
			categories: {
				deep: true,
				handler() {
					this.renderChart()
				}
			},
			series: {
				deep: true,
				handler() {
					this.renderChart()
				}
			},
			chartType() {
				this.destroyChart()
				this.renderChart()
			},
			hasData(val) {
				if (!val) this.destroyChart()
				else this.renderChart()
			}
		},
		beforeDestroy() {
			this.destroyChart()
		},
		// #ifdef VUE3
		beforeUnmount() {
			this.destroyChart()
		},
		// #endif
		methods: {
			initCanvas() {
				this.cWidth = uni.upx2px(702)
				this.cHeight = uni.upx2px(420)
				// #ifdef MP-ALIPAY
				this.pixelRatio = 2
				// #endif
				this.ready = true
				this.$nextTick(() => this.renderChart())
			},
			destroyChart() {
				if (chartMap[this.canvasId]) {
					delete chartMap[this.canvasId]
				}
			},
			getYAxisMax() {
				if (this.yMax > 0) return this.yMax
				const values = (this.series || []).flatMap((s) => s.data || [])
				const maxVal = values.length ? Math.max(...values) : 10
				return Math.max(10, Math.ceil(maxVal * 1.2))
			},
			buildOptions() {
				const common = {
					$this: this,
					canvasId: this.canvasId,
					fontSize: 11,
					padding: [15, 15, 0, 15],
					legend: {
						show: this.chartType !== 'pie' && this.chartType !== 'ring',
						padding: 5,
						lineHeight: 11,
						margin: 5
					},
					background: '#FFFFFF',
					pixelRatio: this.pixelRatio,
					animation: false,
					width: this.cWidth * this.pixelRatio,
					height: this.cHeight * this.pixelRatio,
					dataLabel: this.chartType === 'pie' || this.chartType === 'ring',
					dataPointShape: this.chartType === 'area' || this.chartType === 'line'
				}

				if (this.chartType === 'pie' || this.chartType === 'ring') {
					return {
						...common,
						type: this.chartType,
						series: this.series,
						extra: {
							pie: {
								lableWidth: 15
							},
							ring: {
								ringWidth: 28
							}
						}
					}
				}

				return {
					...common,
					type: this.chartType,
					categories: this.categories,
					series: this.series,
					enableScroll: this.enableScroll,
					xAxis: {
						disableGrid: false,
						type: 'grid',
						gridType: 'dash',
						itemCount: this.enableScroll ? 7 : Math.min(7, (this.categories || []).length || 7),
						scrollShow: this.enableScroll,
						scrollAlign: 'left'
					},
					yAxis: {
						gridType: 'dash',
						splitNumber: 4,
						min: 0,
						max: this.getYAxisMax(),
						format: (val) => `${Math.round(val)}分`
					},
					extra: {
						area: {
							type: 'curve',
							opacity: 0.18,
							addLine: true,
							width: 2,
							gradient: true
						},
						column: {
							width: this.chartType === 'column' ? 18 : undefined
						},
						lineStyle: 'curve'
					}
				}
			},
			renderChart() {
				if (!this.ready || !this.hasData) return
				this.destroyChart()
				chartMap[this.canvasId] = new uCharts(this.buildOptions())
			},
			touchStart(e) {
				const chart = chartMap[this.canvasId]
				if (chart && this.enableScroll) chart.scrollStart(e)
			},
			touchMove(e) {
				const chart = chartMap[this.canvasId]
				if (chart && this.enableScroll) chart.scroll(e)
			},
			touchEnd(e) {
				const chart = chartMap[this.canvasId]
				if (chart && this.enableScroll) chart.scrollEnd(e)
			}
		}
	}
</script>

<style lang="scss">
	.stats-chart {
		background: #fff;
		border-radius: 16rpx;
		padding: 20rpx 18rpx 12rpx;
	}

	.stats-chart__title {
		font-size: 28rpx;
		font-weight: 800;
		color: #111827;
		margin-bottom: 12rpx;
	}

	.stats-chart__empty {
		height: 320rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9ca3af;
		font-size: 24rpx;
		text-align: center;
		padding: 0 24rpx;
	}

	.stats-chart__box {
		width: 100%;
		overflow: hidden;
	}

	.stats-chart__canvas {
		width: 702rpx;
		height: 420rpx;
	}
</style>
