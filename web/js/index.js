var main = new Vue({
	el: '.platform_wrapper',
	data: {
		selected_paltform:'',
		apps_page: 1,
		apps: [],
		show_load_more_apps_button: true,
	},
	methods: {
		switchPlatform: function (event) {
			var platform = event.target.innerText.toLowerCase()
			if (this.selected_paltform !== platform) {
				this.selected_paltform = platform
				this.apps_page = 1
				this.apps = []
				this.loadApps()
			}
		},
		loadApps: function () {
			axios.get("/apps/"+this.selected_paltform+"/"+this.apps_page).then(response => {
	            console.log(response.data)
	            this.apps = this.apps.concat(response.data)
	            this.apps_page++
	            this.show_load_more_apps_button = response.data.length > 0
	        });
		},
		viewAllVersion: function (e) {
			window.location.href += "versionlist.html?platform=" + this.selected_paltform + "&bundleID=" + e.currentTarget.getAttribute('bundle-id')
		}
	}
});
new Vue({
	el: '.qrcode_wrapper',
	data: {
		qrcode_box_show: false,
	},
	methods: {
		toggleQrcode: function () {
			this.qrcode_box_show = !this.qrcode_box_show
		}
	}
});

main.selected_paltform = 'ios';
main.loadApps()
new QRCode(document.getElementsByClassName('qrcode_pic')[0], {
	text: location.href,
	width: 160,
	height: 160,
	colorDark : "#000000",
	colorLight : "#ffffff",
	correctLevel : QRCode.CorrectLevel.H
});
