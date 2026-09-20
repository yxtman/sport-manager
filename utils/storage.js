import { getStoredUser, isLoggedIn } from '@/utils/authSession'

const STORAGE_KEY = 'sport_manager_state_v1'
const CLEARED_FLAG = `${STORAGE_KEY}__cleared`
const LEGACY_RECORDS_KEY = 'sport_records'

function userScopedKey() {
	try {
		if (isLoggedIn()) {
			const u = getStoredUser() || {}
			const username = (u.username || '').trim()
			if (username) return `${STORAGE_KEY}__user__${username}`
			return `${STORAGE_KEY}__user__token`
		}
	} catch (e) {}
	return `${STORAGE_KEY}__guest`
}

function parseRaw(raw) {
	if (!raw) return null
	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw)
		} catch (e) {
			return null
		}
	}
	return raw
}

function isStorageEmpty(raw) {
	if (raw == null || raw === '') return true
	const parsed = parseRaw(raw)
	if (!parsed) return true
	const records = parsed.records
	return !Array.isArray(records) || records.length === 0
}

function listSportStorageKeys() {
	const keys = new Set([STORAGE_KEY, `${STORAGE_KEY}__guest`, LEGACY_RECORDS_KEY, CLEARED_FLAG])
	try {
		const info = uni.getStorageInfoSync()
		;(info.keys || []).forEach((key) => {
			if (
				key === STORAGE_KEY ||
				key === LEGACY_RECORDS_KEY ||
				key.startsWith(`${STORAGE_KEY}__`)
			) {
				keys.add(key)
			}
		})
	} catch (e) {}
	return [...keys]
}

/** H5 浏览器下 uni 存储 key 可能带前缀，需直接扫 localStorage */
function purgeBrowserSportKeys() {
	try {
		if (typeof window === 'undefined' || !window.localStorage) return
		const toRemove = []
		for (let i = 0; i < window.localStorage.length; i++) {
			const key = window.localStorage.key(i)
			if (!key) continue
			if (key.includes(STORAGE_KEY) || key.includes(LEGACY_RECORDS_KEY)) {
				toRemove.push(key)
			}
		}
		toRemove.forEach((key) => {
			try {
				window.localStorage.removeItem(key)
			} catch (e) {}
		})
	} catch (e) {}
}

function migrateIfNeeded() {
	try {
		if (uni.getStorageSync(CLEARED_FLAG)) return

		const newKey = userScopedKey()
		const existingRaw = uni.getStorageSync(newKey)
		if (!isStorageEmpty(existingRaw)) return

		const legacyRaw = uni.getStorageSync(STORAGE_KEY)
		const legacy = parseRaw(legacyRaw)
		if (!legacy || !Array.isArray(legacy.records) || legacy.records.length === 0) {
			return
		}

		uni.setStorageSync(newKey, JSON.stringify(legacy))
		try {
			uni.removeStorageSync(STORAGE_KEY)
		} catch (e) {}
	} catch (e) {}
}

export function loadState() {
	try {
		if (uni.getStorageSync(CLEARED_FLAG)) {
			return null
		}
		migrateIfNeeded()
		const raw = uni.getStorageSync(userScopedKey())
		if (isStorageEmpty(raw)) return null
		return parseRaw(raw)
	} catch (e) {
		return null
	}
}

export function saveState(state) {
	try {
		try {
			uni.removeStorageSync(CLEARED_FLAG)
		} catch (e) {}
		uni.setStorageSync(userScopedKey(), JSON.stringify(state))
		return true
	} catch (e) {
		return false
	}
}

/** 删除本 App 所有运动本地数据（游客、各登录用户、旧版 key） */
export function clearState() {
	try {
		listSportStorageKeys().forEach((key) => {
			try {
				uni.removeStorageSync(key)
			} catch (e) {}
		})
		purgeBrowserSportKeys()
		uni.setStorageSync(CLEARED_FLAG, '1')
		return true
	} catch (e) {
		return false
	}
}
