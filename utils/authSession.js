import apiConfig from '@/utils/apiConfig'

const TOKEN_KEY = 'sport_mysql_jwt'
const USER_KEY = 'sport_mysql_user'

function buildUrl(path) {
	const base = apiConfig.BASE_URL.replace(/\/$/, '')
	const p = path.startsWith('/') ? path : `/${path}`
	return base + p
}

function buildRequestFailMessage(err) {
	const rawMsg = (err && err.errMsg) || '网络错误'
	const base = apiConfig.BASE_URL || ''
	const isLoopbackBase = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(base)
	// 真机/模拟器里 127.0.0.1 指向设备自身，不是电脑上的 Spring Boot 服务
	if (isLoopbackBase) {
		return `请求失败：当前接口地址是 ${base}。如果你正在真机/模拟器运行，请把 utils/apiConfig.js 里的后端地址改成电脑局域网 IP，例如 http://192.168.1.6:8081`
	}
	if (/^(request:fail|network error)/i.test(rawMsg) || /Failed to fetch/i.test(rawMsg)) {
		return `无法连接到电脑后端（${base}）。请确认：① 电脑后端已启动 ② 手机/电脑在同一WiFi ③ 防火墙放行 8081 端口`
	}
	return rawMsg
}

export function request({ path, method = 'GET', data, withAuth = false }) {
	return new Promise((resolve, reject) => {
		const header = {
			'Content-Type': 'application/json'
		}
		if (withAuth) {
			const token = uni.getStorageSync(TOKEN_KEY)
			if (token) header.Authorization = `Bearer ${token}`
		}
		// H5 下部分运行时将对象当表单序列化，Spring @RequestBody 收不到 JSON；显式 stringify 最稳
		const payload =
			method === 'GET' || data === undefined || data === null
				? undefined
				: typeof data === 'string'
					? data
					: JSON.stringify(data)
		uni.request({
			url: buildUrl(path),
			method,
			data: payload,
			header,
			success: (res) => {
				if (res.statusCode >= 200 && res.statusCode < 300) {
					resolve(res.data)
					return
				}
				let body = res.data
				if (typeof body === 'string') {
					try {
						body = JSON.parse(body)
					} catch (e) {
						body = { error: body }
					}
				}
				const msg =
					(body && (body.error || body.message || body.detail || body.title)) ||
					`请求失败(${res.statusCode})`
				reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
			},
			fail: (err) => {
				reject(new Error(buildRequestFailMessage(err)))
			}
		})
	})
}

export async function apiRegister({ username, password, nickname }) {
	return request({
		path: '/api/auth/register',
		method: 'POST',
		data: { username, password, nickname: nickname || '' },
		withAuth: false
	})
}

export async function apiLogin({ username, password }) {
	return request({
		path: '/api/auth/login',
		method: 'POST',
		data: { username, password },
		withAuth: false
	})
}

export async function apiMe() {
	return request({
		path: '/api/auth/me',
		method: 'GET',
		withAuth: true
	})
}

export async function apiUpdateProfile({ nickname }) {
	return request({
		path: '/api/auth/profile',
		method: 'PATCH',
		data: { nickname },
		withAuth: true
	})
}

export async function apiChangePassword({ oldPassword, newPassword }) {
	return request({
		path: '/api/auth/change-password',
		method: 'POST',
		data: { oldPassword, newPassword },
		withAuth: true
	})
}

export function saveSession(token, user) {
	uni.setStorageSync(TOKEN_KEY, token)
	uni.setStorageSync(USER_KEY, JSON.stringify(user || {}))
}

export function clearSession() {
	try {
		uni.removeStorageSync(TOKEN_KEY)
		uni.removeStorageSync(USER_KEY)
	} catch (e) {}
}

export function getStoredUser() {
	try {
		const raw = uni.getStorageSync(USER_KEY)
		if (!raw) return null
		return typeof raw === 'string' ? JSON.parse(raw) : raw
	} catch (e) {
		return null
	}
}

export function isLoggedIn() {
	return !!uni.getStorageSync(TOKEN_KEY)
}

export function getToken() {
	try {
		return uni.getStorageSync(TOKEN_KEY) || ''
	} catch (e) {
		return ''
	}
}
