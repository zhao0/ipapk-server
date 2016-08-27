Install ipa,apk via HTTPS, and auto generate certificates. Based on [ios-ipa-server](https://github.com/bumaociyuan/ios-ipa-server)

[中文介绍](./README.md)

# Support Platform
* OS X
* Ubuntu
* Not test for other platform

# Require
* [nodejs](https://nodejs.org/)

# Installation
```
$ npm install -g ipapk-server
```

# Usage
```
Usage: ipapk-server [option] [dir]

Options:

-h, --help                output usage information
-V, --version             output the version number
-p, --port <port-number>  set port for server (defaults is 1234)
```

## Prepare
- Create the following directory

```
___path-of-ipa-and-apk
|____ipa
|____apk
```
- place ipa files in ipa folder
- place apk files in apk folder

## Start Server
```
$ cd path-of-ipa-and-apk
$ ipapk-server

# or 

$ ipapk-server path-of-ipa-and-apk


# open https://ip:port/download on your iphone 
```

### About `ipa` archive
* [Ad-hoc](https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/AppDistributionGuide/TestingYouriOSApp/TestingYouriOSApp.html)
* [Enterprise Distributing](https://developer.apple.com/library/ios/documentation/IDEs/Conceptual/AppDistributionGuide/DistributingEnterpriseProgramApps/DistributingEnterpriseProgramApps.html)
* For normal developer you can use the [shenzhen](https://github.com/nomad/shenzhen)、[gym](https://github.com/fastlame/gym) to build the `ipa`.
* Highly recommond use static ip address, avoid reinstall cer every time.

### Install App
* Open `https://ip:port/download` in your phone browser(iPhone user must use Safari).
* The first time webpage will alert `Cannot Verify Server Identity`, plz click `Details` button, and install the certificate by follow the hint press next and input password.
* Click the `ipa` link to install `ipa`.

![simulator screen shot jun 22 2016 2 38 35 pm 2](https://cloud.githubusercontent.com/assets/4977911/16257321/66d10888-388a-11e6-9b2d-d5ed0d100d8c.png)

# Screenshots
![screeshot](screeshot.png)

# Develop

```
# Download source code
$ git clone git@github.com:zhao0/ipapk-server.git

# Install modules
$ cd ipapk-server
$ npm install 

# Make link for debug
$ npm link

# Run
$ cd path-of-ipa-and-apk
$ ipapk-server
```

# TODO

- [ ] Support Internationalization
- [ ] Support [shenzhen](https://github.com/nomad/shenzhen)
- [ ] Support upload IPA

