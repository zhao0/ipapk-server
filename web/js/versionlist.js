
var reg_url = /^[^\?]+\?([\w\W]+)$/,
reg_para = /([^&=]+)=([\w\W]*?)(&|$|#)/g,
arr_url = reg_url.exec(window.location.href),
query = {};
if (arr_url && arr_url[1]) {
	var str_para = arr_url[1], result;
	while ((result = reg_para.exec(str_para)) != null) {
		query[result[1]] = result[2];
	}
}

var main = new Vue({
	el: '.platform_wrapper',
	data: {
		selected_paltform: query.platform,
		bundle_id: query.bundleID,
		page: 1,
		apps: [],
		show_load_more_apps_button: true,
	},
	methods: {
		loadApps: function () {
			axios.get("/apps/"+this.selected_paltform+"/"+this.bundle_id+"/"+this.page).then(response => {
	            this.apps = this.apps.concat(response.data)
	            this.page++
	            this.show_load_more_apps_button = response.data.length > 0
	        });
		},
	},
	computed: {
		has_data: function () {
			return this.apps.length > 0
		}
	}
});
main.loadApps()
