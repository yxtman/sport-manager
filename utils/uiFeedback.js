/**
 * 统一交互反馈：成功提示 + App 端轻微震动（若支持）
 */
export function feedbackSuccess(title = '已完成') {
	uni.showToast({ title, icon: 'success', duration: 1600 })
	// #ifdef APP-PLUS
	try {
		if (typeof uni.vibrateShort === 'function') {
			uni.vibrateShort({ type: 'light' })
		}
	} catch (e) {}
	// #endif
}

export function feedbackInfo(title) {
	uni.showToast({ title, icon: 'none', duration: 1400 })
}
