/**
 * H5 开发：页面在 5173 等端口时 BASE_URL 为空 → 请求 /api/... 走 manifest 里 devServer.proxy 到 Spring（默认 8081），与页面同域，无 CORS。
 * 真机/模拟器/App：127.0.0.1 指向设备自身，必须改成你电脑的局域网 IP，例如 http://192.168.1.6:8081
 */
// 真机调试时改成你电脑的局域网 IP，例如 http://192.168.1.6:8081
const LAN_BASE_URL = 'http://192.168.1.6:8081'

function resolveBase() {
	try {
		if (typeof window !== 'undefined' && window.location) {
			const port = window.location.port
			const host = window.location.hostname
			if ((host === 'localhost' || host === '127.0.0.1') && port && port !== '8081') {
				return ''
			}
		}
	} catch (e) {}
	try {
		if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
			return ''
		}
	} catch (e2) {}
	return LAN_BASE_URL
}

const BASE_URL = resolveBase()

export function getApiBase() {
	return BASE_URL
}

export default {
	BASE_URL
}
