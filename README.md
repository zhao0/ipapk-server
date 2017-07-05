# Introduction
Automatically generate self-signed HTTPS server, you can quickly install ipa, apk, based on [ios-ipa-server](https://github.com/bumaociyuan/ios-ipa-server).

# Supported Platform
* OS X
* Ubuntu
* CentOS

# Needs
* [nodejs](https://nodejs.org/)

# Installation
```
$ npm install -g ipapk-server
```
CentOS 64 bit need to be installed separately

```
 yum install ld-linux.so.2 libz.so.1 libstdc++.so.6
```

# Usage
```
Usage: ipapk-server [option]

Options:

--help                output usage information
-V, --version             output the version number
-p, --port <port-number>  set port for server (defaults is 1234)
-b, --bind <bind>     set bind for server (defaults is your LAN ip)
-h, --host <host-name>     set hostname for server (required)
```

## Run
```
$ ipapk-server

```

## Open
Open in the phone browser `https://ip:port/`
> - Remember `https`
> - IOS download must use Safari
### Note
IOS 10.3 does not trust the installation of the default certificate, you need to manually trust.
> Settings> General> About> Certificate Trust Settings> Enable full trust for required certificates

![](ss1.jpeg)
![](ss2.jpeg)

The project provides a default web download page, and also provides APIs for easy integration into other platforms.

## API
### Upload
path:

```
POST /upload
```

param:

```
package:Package File, reqiured
changelog:ChangeLog, optional
```
response:

```
{
  platform: 'ios',
  build: '1608051045',
  bundleID: 'com.jianshu.Hugo',
  version: '2.11.4',
  name: 'Hugo',
  guid: '46269d71-9fda-76fc-3442-a118d6b08bf1'
}
```
Curl:`curl 'https://ip:port/upload' -F "package=@<file-path>" -F "changelog=xxx" --insecure`，can not be removed`@`

### App List
path:

```
GET /apps/:platform/:page
```
params:

```
:platform: ios or android
:page: page number，default 1
```
response:

```
[
	{
		id: 6,
		guid: "46269d71-9fda-76fc-3442-a118d6b08bf1",
		bundleID: "com.jianshu.Hugo",
		version: "2.11.4",
		build: "1608051045",
		icon: "https://10.20.30.233:1234/icon/46269d71-9fda-76fc-3442-a118d6b08bf1.png",
		name: "Hugo",
		uploadTime: "2016-12-01 20:50:05",
		platform: "ios",
		url: "itms-services://?action=download-manifest&url=https://10.20.30.233:1234/plist/46269d71-9fda-76fc-3442-a118d6b08bf1",
		changelog: "add feature"
	},
	{
		id: 3,
		guid: "baac66f0-0e7b-f72c-40e3-378aab26fd9b",
		bundleID: "com.jianshu.victor",
		version: "1.1.0",
		build: "1611251530",
		icon: "https://10.20.30.233:1234/icon/baac66f0-0e7b-f72c-40e3-378aab26fd9b.png",
		name: "Victor",
		uploadTime: "2016-11-26 20:47:43",
		platform: "ios",
		url: "itms-services://?action=download-manifest&url=https://10.20.30.233:1234/plist/baac66f0-0e7b-f72c-40e3-378aab26fd9b",
		changelog: "bug fix"
	}
]
```
### App List by the bundleID
path:

```
/apps/:platform/:bundleID/:page
```
params:

```
:platform: ios or android
:bundleID: app bundleID
:page: page number，default 1
```
response:

```
[
	{
		id: 5,
		guid: "a8573b7a-18bc-1925-f2b4-8842db2153aa",
		bundleID: "com.jianshu.Hugo",
		version: "2.11.4",
		build: "1608051045",
		icon: "https://10.20.30.233:1234/icon/a8573b7a-18bc-1925-f2b4-8842db2153aa.png",
		name: "Hugo",
		uploadTime: "2016-11-26 21:00:51",
		platform: "ios",
		url: "itms-services://?action=download-manifest&url=https://10.20.30.233:1234/plist/a8573b7a-18bc-1925-f2b4-8842db2153aa",
		changelog: "add feature"
	},
	{
		id: 6,
		guid: "46269d71-9fda-76fc-3442-a118d6b08bf1",
		bundleID: "com.jianshu.Hugo",
		version: "2.11.4",
		build: "1608051045",
		icon: "https://10.20.30.233:1234/icon/46269d71-9fda-76fc-3442-a118d6b08bf1.png",
		name: "Hugo",
		uploadTime: "2016-12-01 20:50:05",
		platform: "ios",
		url: "itms-services://?action=download-manifest&url=https://10.20.30.233:1234/plist/46269d71-9fda-76fc-3442-a118d6b08bf1",
		changelog: "add feature"
	}
]
```
# SSL certificate
The project will serve on `http`. You should use an reverse-proxy server such as Nginx with ssl.


# TODO
- Token verification
- International support

# Contribution
[zhao0](https://github.com/zhao0)、[mask2](https://github.com/mask2)
