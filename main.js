import App from './App'
import store from './store'

// #ifndef VUE3
import Vue from 'vue'
Vue.config.productionTip = false
Vue.prototype.$store = store
App.mpType = 'app'
const app = new Vue({
	store,
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import Vuex from 'vuex'
export function createApp() {
	const app = createSSRApp(App)
	app.use(store)
	return {
		app,
		Vuex
	}
}
// #endif
