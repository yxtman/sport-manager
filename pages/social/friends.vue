<template>
	<view class="page">
		<view class="card">
			<view class="title">好友中心</view>
			<view class="feature-hint">已支持：好友申请（需对方同意）· 删除好友 · 拉黑 / 取消拉黑</view>
			<view class="search">
				<input class="search__input" v-model="keyword" placeholder="输入用户名或昵称搜索" confirm-type="search" @confirm="doSearch" />
				<button class="search__btn" size="mini" @tap="doSearch">搜索</button>
			</view>
		</view>

		<view class="card" v-if="offlineTip">
			<view class="title">连接提示</view>
			<view class="desc offline-tip">{{ offlineTip }}</view>
		</view>

		<view class="card" v-if="!loading && incoming.length === 0 && friends.length === 0">
			<view class="title">好友申请</view>
			<view class="empty">暂无待处理申请。搜索用户后点「申请好友」，对方在「收到的好友申请」里同意即可。</view>
		</view>

		<view class="card" v-if="incoming.length">
			<view class="title-row">
				<view class="title">收到的好友申请</view>
				<text class="badge">{{ incoming.length }}</text>
			</view>
			<view v-for="req in incoming" :key="req.id" class="user-row">
				<view class="avatar">{{ avatarText(req.user) }}</view>
				<view class="user-main">
					<view class="name">{{ req.user.nickname || req.user.username }}</view>
					<view class="sub">用户名：{{ req.user.username }}</view>
				</view>
				<view class="actions">
					<button class="mini primary" size="mini" @tap="accept(req.id)">同意</button>
					<button class="mini ghost" size="mini" @tap="reject(req.id)">拒绝</button>
				</view>
			</view>
		</view>

		<view class="card" v-if="results.length">
			<view class="title">搜索结果</view>
			<view v-for="u in results" :key="u.id" class="user-row">
				<view class="avatar">{{ avatarText(u) }}</view>
				<view class="user-main">
					<view class="name">{{ u.nickname || u.username }}</view>
					<view class="sub">用户名：{{ u.username }}</view>
				</view>
				<view class="actions">
					<button
						v-if="relationLabel(u.id) === 'friend'"
						class="mini disabled"
						size="mini"
						disabled
					>已是好友</button>
					<button
						v-else-if="relationLabel(u.id) === 'outgoing'"
						class="mini disabled"
						size="mini"
						disabled
					>已申请</button>
					<button
						v-else-if="relationLabel(u.id) === 'incoming'"
						class="mini primary"
						size="mini"
						@tap="acceptIncomingFrom(u.id)"
					>同意申请</button>
					<button v-else class="mini primary" size="mini" @tap="sendRequest(u.id)">申请好友</button>
					<button class="mini ghost danger-mini" size="mini" @tap="confirmBlock(u)">拉黑</button>
				</view>
			</view>
		</view>

		<view class="card" v-if="outgoing.length">
			<view class="title">已发送的申请</view>
			<view v-for="req in outgoing" :key="req.id" class="user-row">
				<view class="avatar">{{ avatarText(req.user) }}</view>
				<view class="user-main">
					<view class="name">{{ req.user.nickname || req.user.username }}</view>
					<view class="sub">等待对方同意</view>
				</view>
				<text class="status-tag">待处理</text>
			</view>
		</view>

		<view class="card">
			<view class="title-row">
				<view class="title">我的好友</view>
				<text class="link" @tap="goFeed">好友动态 ›</text>
			</view>
			<view v-if="loading" class="empty">加载中...</view>
			<view v-else-if="friends.length === 0" class="empty">暂无好友。搜索用户并发送申请，对方同意后即可互看动态。</view>
			<view v-else>
				<view v-for="u in friends" :key="u.id" class="user-row">
					<view class="avatar">{{ avatarText(u) }}</view>
					<view class="user-main">
						<view class="name">{{ u.nickname || u.username }}</view>
						<view class="sub">{{ u.username }}</view>
					</view>
					<view class="actions">
						<button class="mini ghost" size="mini" @tap="confirmRemoveFriend(u)">删除</button>
						<button class="mini ghost danger-mini" size="mini" @tap="confirmBlock(u)">拉黑</button>
					</view>
				</view>
			</view>
		</view>

		<view class="card" v-if="blocked.length">
			<view class="title">已拉黑</view>
			<view class="desc">拉黑后将解除好友关系，双方无法互看动态或发送申请。</view>
			<view v-for="u in blocked" :key="'block-' + u.id" class="user-row">
				<view class="avatar avatar--muted">{{ avatarText(u) }}</view>
				<view class="user-main">
					<view class="name">{{ u.nickname || u.username }}</view>
					<view class="sub">{{ u.username }}</view>
				</view>
				<button class="mini ghost" size="mini" @tap="confirmUnblock(u)">取消拉黑</button>
			</view>
		</view>
	</view>
</template>

<script>
	import apiConfig from '@/utils/apiConfig'
	import { isLoggedIn } from '@/utils/authSession.js'
	import {
		addFriend,
		acceptFriendRequest,
		blockUser,
		deleteFriend,
		getBlockedUsers,
		getFriends,
		getIncomingFriendRequests,
		getOutgoingFriendRequests,
		rejectFriendRequest,
		searchUsers,
		unblockUser
	} from '@/utils/socialApi.js'
	import { feedbackSuccess } from '@/utils/uiFeedback.js'

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
				keyword: '',
				loading: false,
				friends: [],
				incoming: [],
				outgoing: [],
				blocked: [],
				results: []
			}
		},
		onShow() {
			this.loadAll()
		},
		methods: {
			ensureLogin() {
				if (isLoggedIn()) return true
				uni.showToast({ title: '请先登录', icon: 'none' })
				setTimeout(() => uni.navigateTo({ url: '/pages/auth/login' }), 500)
				return false
			},
			loadAll() {
				if (!this.ensureLogin()) return
				this.loading = true
				Promise.all([getFriends(), getIncomingFriendRequests(), getOutgoingFriendRequests(), getBlockedUsers()])
					.then(([friends, incoming, outgoing, blocked]) => {
						this.offlineTip = ''
						this.friends = Array.isArray(friends) ? friends : []
						this.incoming = Array.isArray(incoming) ? incoming : []
						this.outgoing = Array.isArray(outgoing) ? outgoing : []
						this.blocked = Array.isArray(blocked) ? blocked : []
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '加载失败', icon: 'none' })
					})
					.finally(() => { this.loading = false })
			},
			doSearch() {
				if (!this.ensureLogin()) return
				const q = (this.keyword || '').trim()
				if (!q) {
					uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
					return
				}
				searchUsers(q)
					.then((list) => {
						this.offlineTip = ''
						this.results = Array.isArray(list) ? list : []
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '搜索失败', icon: 'none' })
					})
			},
			relationLabel(userId) {
				if ((this.friends || []).some((f) => f.id === userId)) return 'friend'
				if ((this.outgoing || []).some((r) => r.user && r.user.id === userId)) return 'outgoing'
				if ((this.incoming || []).some((r) => r.user && r.user.id === userId)) return 'incoming'
				return 'none'
			},
			sendRequest(id) {
				addFriend(id)
					.then((res) => {
						this.offlineTip = ''
						const msg = (res && res.message) || '好友申请已发送'
						if (res && res.accepted) {
							feedbackSuccess('已互为好友')
						} else {
							feedbackSuccess(msg)
						}
						this.loadAll()
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '申请失败', icon: 'none' })
					})
			},
			accept(requestId) {
				acceptFriendRequest(requestId)
					.then(() => {
						this.offlineTip = ''
						feedbackSuccess('已添加好友')
						this.loadAll()
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '操作失败', icon: 'none' })
					})
			},
			acceptIncomingFrom(userId) {
				const req = (this.incoming || []).find((r) => r.user && r.user.id === userId)
				if (!req) return
				this.accept(req.id)
			},
			reject(requestId) {
				rejectFriendRequest(requestId)
					.then(() => {
						this.offlineTip = ''
						feedbackSuccess('已拒绝')
						this.loadAll()
					})
					.catch((e) => {
						this.offlineTip = buildOfflineTip(e && e.message)
						uni.showToast({ title: e.message || '操作失败', icon: 'none' })
					})
			},
			confirmRemoveFriend(u) {
				const name = (u && (u.nickname || u.username)) || '该用户'
				uni.showModal({
					title: '删除好友',
					content: `确定删除「${name}」吗？删除后需重新申请才能互看动态。`,
					success: (res) => {
						if (!res.confirm || !u || !u.id) return
						deleteFriend(u.id)
							.then(() => {
								this.offlineTip = ''
								feedbackSuccess('已删除好友')
								this.loadAll()
							})
							.catch((e) => {
								this.offlineTip = buildOfflineTip(e && e.message)
								uni.showToast({ title: e.message || '删除失败', icon: 'none' })
							})
					}
				})
			},
			confirmBlock(u) {
				const name = (u && (u.nickname || u.username)) || '该用户'
				uni.showModal({
					title: '拉黑用户',
					content: `确定拉黑「${name}」吗？将解除好友关系，双方无法再互动。`,
					success: (res) => {
						if (!res.confirm || !u || !u.id) return
						blockUser(u.id)
							.then(() => {
								this.offlineTip = ''
								feedbackSuccess('已拉黑')
								this.results = (this.results || []).filter((item) => item.id !== u.id)
								this.loadAll()
							})
							.catch((e) => {
								this.offlineTip = buildOfflineTip(e && e.message)
								uni.showToast({ title: e.message || '拉黑失败', icon: 'none' })
							})
					}
				})
			},
			confirmUnblock(u) {
				const name = (u && (u.nickname || u.username)) || '该用户'
				uni.showModal({
					title: '取消拉黑',
					content: `确定取消拉黑「${name}」吗？`,
					success: (res) => {
						if (!res.confirm || !u || !u.id) return
						unblockUser(u.id)
							.then(() => {
								this.offlineTip = ''
								feedbackSuccess('已取消拉黑')
								this.loadAll()
							})
							.catch((e) => {
								this.offlineTip = buildOfflineTip(e && e.message)
								uni.showToast({ title: e.message || '操作失败', icon: 'none' })
							})
					}
				})
			},
			goFeed() {
				uni.navigateTo({ url: '/pages/social/feed' })
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
	.card { background: #fff; border-radius: 18rpx; padding: 22rpx 20rpx; margin-bottom: 20rpx; }
	.title { font-size: 30rpx; font-weight: 900; color: #111827; }
	.title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
	.badge {
		min-width: 36rpx;
		padding: 4rpx 12rpx;
		border-radius: 999px;
		background: #ef4444;
		color: #fff;
		font-size: 20rpx;
		font-weight: 700;
		text-align: center;
	}
	.link { color: #1e80ff; font-size: 24rpx; font-weight: 700; }
	.search { display: flex; gap: 12rpx; margin-top: 16rpx; }
	.search__input { flex: 1; background: #f9fafb; border-radius: 999px; padding: 0 22rpx; height: 70rpx; font-size: 26rpx; }
	.search__btn, .primary { background: #1e80ff; color: #fff; border-radius: 999px; }
	.user-row { display: flex; align-items: center; gap: 16rpx; padding: 18rpx 0; border-bottom: 1px solid rgba(0,0,0,0.06); flex-wrap: wrap; }
	.user-row:last-child { border-bottom: none; }
	.feature-hint {
		margin: 8rpx 0 16rpx;
		padding: 12rpx 16rpx;
		background: rgba(30, 128, 255, 0.08);
		border-radius: 12rpx;
		font-size: 22rpx;
		color: #1e80ff;
		line-height: 1.5;
	}
	.avatar { width: 72rpx; height: 72rpx; border-radius: 50%; background: rgba(30,128,255,0.12); color: #1e80ff; display: flex; align-items: center; justify-content: center; font-weight: 900; }
	.avatar--muted { background: #f3f4f6; color: #9ca3af; }
	.user-main { flex: 1; min-width: 0; }
	.name { font-size: 28rpx; font-weight: 800; color: #111827; }
	.sub { margin-top: 6rpx; font-size: 22rpx; color: #6b7280; }
	.actions { display: flex; gap: 10rpx; flex-wrap: wrap; justify-content: flex-end; margin-left: auto; }
	.mini { padding: 0 18rpx; }
	.ghost { background: #fff; color: #6b7280; border: 1px solid rgba(0,0,0,0.12); border-radius: 999px; }
	.danger-mini { color: #ef4444; border-color: rgba(239,68,68,0.35); }
	.desc { color: #6b7280; font-size: 24rpx; margin-bottom: 10rpx; line-height: 1.45; }
	.disabled { background: #f3f4f6; color: #9ca3af; border-radius: 999px; }
	.status-tag { font-size: 22rpx; color: #f59e0b; font-weight: 700; }
	.empty { color: #6b7280; font-size: 24rpx; padding: 24rpx 0; text-align: center; }
	.offline-tip { margin-top: 10rpx; line-height: 1.5; }
</style>
