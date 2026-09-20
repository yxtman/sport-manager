import { request } from '@/utils/authSession.js'

export function searchUsers(keyword) {
	return request({
		path: `/api/social/users/search?keyword=${encodeURIComponent(keyword || '')}`,
		method: 'GET',
		withAuth: true
	})
}

export function getFriends() {
	return request({
		path: '/api/social/friends',
		method: 'GET',
		withAuth: true
	})
}

export function addFriend(friendId) {
	return request({
		path: `/api/social/friends/${encodeURIComponent(friendId)}`,
		method: 'POST',
		withAuth: true
	})
}

export function getIncomingFriendRequests() {
	return request({
		path: '/api/social/friend-requests/incoming',
		method: 'GET',
		withAuth: true
	})
}

export function getOutgoingFriendRequests() {
	return request({
		path: '/api/social/friend-requests/outgoing',
		method: 'GET',
		withAuth: true
	})
}

export function acceptFriendRequest(requestId) {
	return request({
		path: `/api/social/friend-requests/${encodeURIComponent(requestId)}/accept`,
		method: 'POST',
		withAuth: true
	})
}

export function rejectFriendRequest(requestId) {
	return request({
		path: `/api/social/friend-requests/${encodeURIComponent(requestId)}/reject`,
		method: 'POST',
		withAuth: true
	})
}

export function deleteFriend(friendId) {
	return request({
		path: `/api/social/friends/${encodeURIComponent(friendId)}`,
		method: 'DELETE',
		withAuth: true
	})
}

export function getBlockedUsers() {
	return request({
		path: '/api/social/blocks',
		method: 'GET',
		withAuth: true
	})
}

export function blockUser(userId) {
	return request({
		path: `/api/social/blocks/${encodeURIComponent(userId)}`,
		method: 'POST',
		withAuth: true
	})
}

export function unblockUser(userId) {
	return request({
		path: `/api/social/blocks/${encodeURIComponent(userId)}`,
		method: 'DELETE',
		withAuth: true
	})
}

export function syncSportRecord(record) {
	if (!record || !record.id) return Promise.resolve({ ok: false })
	return request({
		path: '/api/social/records',
		method: 'POST',
		withAuth: true,
		data: {
			id: record.id,
			type: record.type,
			runSubtype: record.runSubtype || '',
			durationMin: record.durationMin,
			distanceKm: record.distanceKm,
			calories: record.calories,
			perceivedEffort: record.perceivedEffort,
			avgHr: record.avgHr,
			maxHr: record.maxHr,
			paceSecPerKm: record.paceSecPerKm,
			startAt: record.startAt,
			note: record.note || '',
			checkInImage: record.checkInImage || '',
			visibility: 'friends'
		}
	})
}

export function deleteSportRecord(recordId) {
	if (!recordId) return Promise.resolve({ ok: false })
	return request({
		path: `/api/social/records/${encodeURIComponent(recordId)}`,
		method: 'DELETE',
		withAuth: true
	})
}

/** 删除云端中已不在本机列表里的动态（用于本地删记录后与好友动态对齐） */
export function pruneSharedRecords(records) {
	const keepIds = (records || []).map((r) => r && r.id).filter(Boolean)
	return request({
		path: '/api/social/records/prune',
		method: 'POST',
		withAuth: true,
		data: { keepIds }
	})
}

export function getFeed() {
	return request({
		path: '/api/social/feed',
		method: 'GET',
		withAuth: true
	})
}

export function toggleLike(recordId) {
	return request({
		path: `/api/social/records/${encodeURIComponent(recordId)}/like`,
		method: 'POST',
		withAuth: true
	})
}

export function getComments(recordId) {
	return request({
		path: `/api/social/records/${encodeURIComponent(recordId)}/comments`,
		method: 'GET',
		withAuth: true
	})
}

export function addComment(recordId, content) {
	return request({
		path: `/api/social/records/${encodeURIComponent(recordId)}/comments`,
		method: 'POST',
		withAuth: true,
		data: { content }
	})
}
