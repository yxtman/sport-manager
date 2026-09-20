<template>
	<view class="page">
		<view class="header">
			<view>
				<view class="header__title">好友动态</view>
				<view class="header__sub">好友保存的运动记录会出现在这里</view>
			</view>
			<button class="refresh" size="mini" @tap="loadFeed">刷新</button>
		</view>

		<view class="card" v-if="offlineTip">
			<view class="header__title">连接提示</view>
			<view class="header__sub offline-tip">{{ offlineTip }}</view>
			<button class="refresh" size="mini" @tap="loadFeed">重试</button>
		</view>

		<view v-if="loading" class="empty">加载中...</view>
		<view v-else-if="feed.length === 0" class="empty">暂无好友动态。先添加好友，或保存一条运动记录同步给好友。</view>

		<view v-else class="feed-list">
			<view v-for="item in feed" :key="item.id" class="feed-card">
				<view class="feed-head">
					<view class="avatar">{{ avatarText(item.user) }}</view>
					<view class="feed-user">
						<view class="feed-name">{{ item.user.nickname || item.user.username }}</view>
						<view class="feed-time">{{ formatTime(item.startAt) }}</view>
					</view>
				</view>

				<view class="record-title">完成了 {{ item.type }} <text v-if="item.runSubtype">· {{ item.runSubtype }}</text></view>
				<view class="record-sub">
					{{ item.durationMin || 0 }} 分钟
					<text v-if="item.distanceKm != null"> · {{ formatNumber(item.distanceKm) }} 公里</text>
					<text v-if="item.calories != null"> · {{ item.calories }} 千卡</text>
				</view>
				<view v-if="item.note" class="note">{{ item.note }}</view>
				<image v-if="item.checkInImage" class="photo" :src="item.checkInImage" mode="aspectFill" @tap="preview(item.checkInImage)" />

				<view class="actions">
					<text class="action" :class="{ 'action--on': item.likedByMe }" @tap="like(item)">{{ item.likedByMe ? '已赞' : '点赞' }} {{ item.likeCount }}</text>
					<text class="action" @tap="openComments(item)">评论 {{ item.commentCount }}</text>
				</view>
			</view>
		</view>

		<uni-popup ref="commentPopup" type="bottom">
			<view class="comment-panel">
				<view class="comment-title">评论</view>
				<scroll-view scroll-y class="comment-list">
					<view v-if="comments.length === 0" class="comment-empty">暂无评论</view>
					<view v-for="c in comments" :key="c.id" class="comment-row">
						<view class="comment-name">{{ c.user.nickname || c.user.username }}</view>
						<view class="comment-content">{{ c.content }}</view>
					</view>
				</scroll-view>
				<view class="comment-input-row">
					<input class="comment-input" v-model="commentText" placeholder="说点鼓励的话" />
					<button class="send" size="mini" @tap="sendComment">发送</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script>
	import apiConfig from '@/utils/apiConfig'
	import { addComment, getComments, getFeed, toggleLike } from '@/utils/socialApi.js'
	import { isLoggedIn } from '@/utils/authSession.js'

	function buildOfflineTip(message) {
		const base = apiConfig.BASE_URL || ''
		const isLoopbackBase = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(base)
		if (isLoopbackBase) {
			return `当前接口地址是 ${base}。真机/模拟器运行时不能用 127.0.0.1，请改成电脑局域网 IP，例如 http://192.168.1.6:8081。`
		}
		if (message && (/无法连接到电脑后端/.test(message) || /network error/i.test(message) || /Failed to fetch/i.test(message))) {
			return `无法连接到电脑后端（${base}）。请确认：① 电脑后端已启动 ② 手机/电脑在同一WiFi ③ 防火墙放行 8081 端口。`
		}
		return ''
	}

	export default {
		data() {
			return {
				offlineTip: '',
				loading: false,
				feed: [],
				activeRecord: null,
				comments: [],
				commentText: ''
			}
		},
		onShow() {
			this.loadFeed()
		},
		methods: {
			ensureLogin() {
				if (isLoggedIn()) return true
				uni.showToast({ title: '请先登录', icon: 'none' })
				setTimeout(() => uni.navigateTo({ url: '/pages/auth/login' }), 500)
				return false
			},
			loadFeed() {
				if (!this.ensureLogin()) return
				this.loading = true
				getFeed()
					.then((list) => {
						this.offlineTip = ''
						this.feed = Array.isArray(list) ? list : []
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '加载动态失败', icon: 'none' })
					})
					.finally(() => { this.loading = false })
			},
			like(item) {
				toggleLike(item.id)
					.then((res) => {
						this.offlineTip = ''
						item.likedByMe = !!res.liked
						item.likeCount = res.likeCount || 0
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '操作失败', icon: 'none' })
					})
			},
			openComments(item) {
				this.activeRecord = item
				this.commentText = ''
				getComments(item.id)
					.then((list) => {
						this.offlineTip = ''
						this.comments = Array.isArray(list) ? list : []
						this.$refs.commentPopup.open()
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '加载评论失败', icon: 'none' })
					})
			},
			sendComment() {
				const text = (this.commentText || '').trim()
				if (!text || !this.activeRecord) return
				addComment(this.activeRecord.id, text)
					.then((c) => {
						this.offlineTip = ''
						this.comments.push(c)
						this.commentText = ''
						this.activeRecord.commentCount += 1
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '评论失败', icon: 'none' })
					})
			},
			preview(src) {
				if (src) uni.previewImage({ urls: [src] })
			},
			formatTime(iso) {
				const d = new Date(iso)
				const mm = String(d.getMonth() + 1).padStart(2, '0')
				const dd = String(d.getDate()).padStart(2, '0')
				const hh = String(d.getHours()).padStart(2, '0')
				const mi = String(d.getMinutes()).padStart(2, '0')
				return `${mm}-${dd} ${hh}:${mi}`
			},
			formatNumber(n) {
				const v = Number(n)
				return v % 1 === 0 ? String(v) : v.toFixed(2)
			},
			avatarText(u) {
				const name = (u && (u.nickname || u.username)) || '友'
				return String(name).slice(0, 1).toUpperCase()
			}
		}
	}
</script>

<style lang="scss">
	.page { padding: 24rpx; }
	.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; }
	.header__title { font-size: 34rpx; font-weight: 900; color: #111827; }
	.header__sub { margin-top: 6rpx; font-size: 22rpx; color: #6b7280; }
	.refresh, .send { background: #1e80ff; color: #fff; border-radius: 999px; }
	.empty { background: #fff; border-radius: 18rpx; padding: 40rpx 24rpx; text-align: center; color: #6b7280; font-size: 24rpx; }
	.feed-list { display: flex; flex-direction: column; gap: 18rpx; }
	.feed-card { background: #fff; border-radius: 18rpx; padding: 22rpx 20rpx; box-shadow: 0 10rpx 30rpx rgba(15, 23, 42, 0.05); }
	.feed-head { display: flex; align-items: center; gap: 14rpx; }
	.avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(30,128,255,0.12); color: #1e80ff; display: flex; align-items: center; justify-content: center; font-weight: 900; }
	.feed-name { font-size: 28rpx; font-weight: 900; color: #111827; }
	.feed-time { margin-top: 4rpx; color: #9ca3af; font-size: 22rpx; }
	.record-title { margin-top: 18rpx; font-size: 28rpx; font-weight: 800; color: #111827; }
	.record-sub, .note { margin-top: 8rpx; color: #6b7280; font-size: 24rpx; line-height: 1.5; }
	.photo { margin-top: 14rpx; width: 100%; height: 360rpx; border-radius: 16rpx; background: #f3f4f6; }
	.actions { margin-top: 16rpx; display: flex; gap: 28rpx; }
	.action { color: #6b7280; font-size: 24rpx; font-weight: 700; }
	.action--on { color: #1e80ff; }
	.comment-panel { background: #fff; border-radius: 24rpx 24rpx 0 0; padding: 24rpx; }
	.comment-title { font-size: 30rpx; font-weight: 900; color: #111827; margin-bottom: 14rpx; }
	.comment-list { max-height: 520rpx; }
	.comment-empty { color: #9ca3af; text-align: center; padding: 40rpx 0; font-size: 24rpx; }
	.comment-row { padding: 16rpx 0; border-bottom: 1px solid rgba(0,0,0,0.06); }
	.comment-name { font-size: 24rpx; font-weight: 800; color: #111827; }
	.comment-content { margin-top: 6rpx; color: #374151; font-size: 24rpx; }
	.comment-input-row { display: flex; gap: 12rpx; margin-top: 16rpx; }
	.comment-input { flex: 1; height: 68rpx; background: #f9fafb; border-radius: 999px; padding: 0 20rpx; font-size: 24rpx; }
	.card { background: #fff; border-radius: 18rpx; padding: 22rpx 20rpx; margin-bottom: 20rpx; }
	.offline-tip { margin-top: 10rpx; line-height: 1.5; }
</style>
