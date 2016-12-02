#!/usr/bin/env node

var fs = require('fs-extra');
var https = require('https');
var path = require('path');
var exit = process.exit;
var pkg = require('./package.json');
var version = pkg.version;
var AdmZip = require("adm-zip")
var program = require('commander');
var express = require('express');
var mustache = require('mustache');
var strftime = require('strftime');
var underscore = require('underscore');
var os = require('os');
var multiparty = require('multiparty');
var sqlite3 = require('sqlite3');  
var Guid = require("Guid")
var extract = require('ipa-extract-info');
var apkParser3 = require("apk-parser3")
require('shelljs/global');

/** 格式化输入字符串**/

//用法: "hello{0}".format('world')；返回'hello world'

String.prototype.format= function(){
  var args = arguments;
  return this.replace(/\{(\d+)\}/g,function(s,i){
    return args[i];
  });
}

var ipAddress = underscore
  .chain(require('os').networkInterfaces())
  .values()
  .flatten()
  .find(function(iface) {
    return iface.family === 'IPv4' && iface.internal === false;
  })
  .value()
  .address;
var pageCount = 15;
var globalCerFolder = os.homedir() + '/.ipapk-server/' + ipAddress;
var serverDir = os.homedir() + "/ipapk-server"
var ipasDir = serverDir + "/ipa";
var apksDir = serverDir + "/apk";
var iconsDir = serverDir + "/icon";
createFolderIfNeeded(serverDir)
createFolderIfNeeded(ipasDir)
createFolderIfNeeded(apksDir)
createFolderIfNeeded(iconsDir)
function createFolderIfNeeded (path) {
  if (!fs.existsSync(path)) {  
    fs.mkdirSync(path, function (err) {
        if (err) {
            console.log(err);
            return;
        }
    });
  }
}

function excuteDB(cmd, params, callback) {
  var db = new sqlite3.Database(serverDir + '/db.sqlite3');
  db.run(cmd, params, callback);
  db.close();
}

function queryDB(cmd, params, callback) {
  var db = new sqlite3.Database(serverDir + '/db.sqlite3');
  db.all(cmd, params, callback);
  db.close();
}

excuteDB("CREATE TABLE IF NOT EXISTS info (\
  id integer PRIMARY KEY autoincrement,\
  guid TEXT,\
  bundleID TEXT,\
  version TEXT,\
  build TEXT,\
  name TEXT,\
  uploadTime datetime default (datetime('now', 'localtime')),\
  platform TEXT\
  )");
/**
 * Main program.
 */
process.exit = exit

// CLI

before(program, 'outputHelp', function() {
  this.allowUnknownOption();
});

program
  .version(version)
  .usage('[option] [dir]')
  .option('-p, --port <port-number>', 'set port for server (defaults is 1234)')
  .parse(process.argv);

var port = program.port || 1234;
var basePath = "https://{0}:{1}".format(ipAddress, port);
if (!exit.exited) {
  main();
}

/**
 * Install a before function; AOP.
 */

function before(obj, method, fn) {
  var old = obj[method];

  obj[method] = function() {
    fn.call(this);
    old.apply(this, arguments);
  };
}

function main() {

  console.log(basePath);

  var key;
  var cert;

  try {
    key = fs.readFileSync(globalCerFolder + '/mycert1.key', 'utf8');
    cert = fs.readFileSync(globalCerFolder + '/mycert1.cer', 'utf8');
  } catch (e) {
    var result = exec('sh  ' + path.join(__dirname, '..', 'generate-certificate.sh') + ' ' + ipAddress).output;
    key = fs.readFileSync(globalCerFolder + '/mycert1.key', 'utf8');
    cert = fs.readFileSync(globalCerFolder + '/mycert1.cer', 'utf8');
  }

  var options = {
    key: key,
    cert: cert
  };

  var app = express();
  app.use('/public', express.static(path.join(__dirname, '..', 'public')));
  app.use('/cer', express.static(globalCerFolder));
  app.use('/ipa', express.static(ipasDir));
  app.use('/apk', express.static(apksDir));
  app.use('/icon', express.static(iconsDir));
  app.get(['/apps/:platform'], function(req, res, next) {
      res.set('Content-Type', 'application/json');
      var page = parseInt(req.params.page ? req.params.page : 1);
      if (req.params.platform === 'android' || req.params.platform === 'ios') {
        queryDB("select * from info where platform=? group by bundleID limit ?,?", [req.params.platform, (page - 1) * pageCount, page * pageCount], function(error, result) {
          if (result) {
            res.send(mapIconAndUrl(result))
          } else {
            errorHandler(error, res)
          }
        })
      }
  });

  app.get(['/apps/:platform/:bundleID', '/apps/:platform/:bundleID/:page'], function(req, res, next) {
      res.set('Content-Type', 'application/json');
      var page = parseInt(req.params.page ? req.params.page : 1);
      if (req.params.platform === 'android' || req.params.platform === 'ios') {
        queryDB("select * from info where platform=? and bundleID=? limit ?,? ", [req.params.platform, req.params.bundleID, (page - 1) * pageCount, page * pageCount], function(error, result) {
          if (result) {
            res.send(mapIconAndUrl(result))
          } else {
            errorHandler(error, res)
          }
        })
      }
  });

  app.get('/plist/:file', function(req, res) {
    fs.readFile(path.join(__dirname, '..', 'templates') + '/template.plist', function(err, data) {
      if (err) throw err;
      var template = data.toString();
      var rendered = mustache.render(template, {
        name: req.params.file,
        basePath: basePath,
      });
      res.set('Content-Type', 'text/plain; charset=utf-8');
      res.send(rendered);
    })
  });

  app.post('/upload', function(req, res) {
    var form = new multiparty.Form();
    form.parse(req, function(err, fields, files) {
      var obj = files.package[0];
      var tmp_path = obj.path;
      parseAppAndInsertToDb(tmp_path, info => {
        storeApp(tmp_path, info["guid"],error => {
          if (error) {
            errorHandler(error,res)
          }
        })
        console.log(info)
        res.send(info)
      }, error => {
        errorHandler(error,res)
      });
    });
  });

  https.createServer(options, app).listen(port);
}

function errorHandler(error, res) {
  console.log(error)
  res.send({"error":error})
}

function mapIconAndUrl(result) {
  var items = result.map(function(item) {
    item.icon = "{0}/icon/{1}.png".format(basePath, item.guid);
    if (item.platform === 'ios') {
      item.url = "itms-services://?action=download-manifest&url={0}/plist/{1}".format(basePath, item.guid);
    } else if (item.platform === 'android') {
      item.url = "{0}/apk/{1}.apk".format(basePath, item.guid);
    }
    return item;
  })
  return items;
}

function parseAppAndInsertToDb(filePath, callback, errorCallback) {
  var guid = Guid.create().toString();
  var parse, extract
  if (path.extname(filePath) === ".ipa") {
    parse = parseIpa
    extract = extractIpaIcon
  } else if (path.extname(filePath) === ".apk") {
    parse = parseApk
    extract = extractApkIcon
  }
  Promise.all([parse(filePath),extract(filePath,guid)]).then(values => {
    var info = values[0]
    info["guid"] = guid
    excuteDB("INSERT INTO info (guid, platform, build, bundleID, version, name) VALUES (?, ?, ?, ?, ?, ?);",
    [info["guid"], info["platform"], info["build"], info["bundleID"], info["version"], info["name"]],function(error){
        if (!error){
          callback(info)
        } else {
          errorCallback(error)
        }
    });
  }, reason => {
    errorCallback(reason)
  })
}

function storeApp(fileName, guid, callback) {
  var new_path;
  if (path.extname(fileName) === ".ipa") {
    new_path = path.join(ipasDir, guid + ".ipa");
  } else if (path.extname(fileName) === ".apk") {
    new_path = path.join(apksDir, guid + ".apk");
  }
  fs.rename(fileName,new_path,callback)
}

function appInfoWithName(filename) {
  return new Promise(function(resolve, reject){
    var stat = fs.statSync(filename);
    var time = new Date(stat.mtime);
    var timeString = strftime('%F %H:%M', time);
    var url;
    var name = path.basename(filename, path.extname(filename));
    resolve({
      name: name,
      description: '更新: ' + timeString,
      time: time,
      url: url,
    })
  });
}

function parseIpa(filename) {
  return new Promise(function(resolve,reject){
    var fd = fs.openSync(filename, 'r');
    extract(fd, function(err, info, raw){
    if (err) reject(err);
      var data = info[0];
      var info = {}
      info["platform"] = "ios"
      info["build"] = data.CFBundleVersion,
      info["bundleID"] = data.CFBundleIdentifier,
      info["version"] = data.CFBundleShortVersionString,
      info["name"] = data.CFBundleName
      resolve(info)
    });
  });
}

function parseApk(filename) {
  return new Promise(function(resolve,reject){
    apkParser3(filename, function (err, data) {
        var package = parseText(data.package)
        var info = {
          "name":data["application-label"].replace(/'/g,""),
          "build":package.versionCode,
          "bundleID":package.name,
          "version":package.versionName,
          "platform":"android"
        }
        resolve(info)
    });
  });
}

function parseText(text) {
  var regx = /(\w+)='([\w\.\d]+)'/g
  var match = null, result = {}
  while(match = regx.exec(text)) {
    result[match[1]] = match[2]
  }
  return result
}

function extractApkIcon(filename,guid) {
  return new Promise(function(resolve,reject){
    apkParser3(filename, function (err, data) {
      var iconPath = data["application-icon-640"]
      iconPath = iconPath.replace(/'/g,"")
      var tmpOut = iconsDir + "/{0}.png".format(guid)
      var zip = new AdmZip(filename); 
      var ipaEntries = zip.getEntries();
      var found = false
      ipaEntries.forEach(function(ipaEntry) {
        if (ipaEntry.entryName.indexOf(iconPath) != -1) {
          var buffer = new Buffer(ipaEntry.getData());
          if (buffer.length) {
            found = true
            fs.writeFile(tmpOut, buffer,function(err){  
              if(err){  
                  reject(err)
              }
              resolve({"success":true})
            })
          }
        }
      })
      if (!found) {
        reject("can not find icon ")
      }
    });
  })
}

function extractIpaIcon(filename,guid) {
  return new Promise(function(resolve,reject){
    var tmpOut = iconsDir + "/{0}.png".format(guid)
    var zip = new AdmZip(filename); 
    var ipaEntries = zip.getEntries();
    var exeName = '';
    if (process.platform == 'darwin') {
      exeName = 'pngdefry-osx';
    } else {
      exeName = 'pngdefry-linux';
    }
    try {
      ipaEntries.forEach(function(ipaEntry) {
        if (ipaEntry.entryName.indexOf('AppIcon60x60@3x.png') != -1) {
          var buffer = new Buffer(ipaEntry.getData());
          if (buffer.length) {
            fs.writeFile(tmpOut, buffer,function(err){  
              if(err){  
                  reject(err)
              }
              exec(path.join(__dirname, 'bin', exeName + ' -s _tmp ') + ' ' + tmpOut);
              fs.remove(tmpOut,function(err){  
                if(err){
                    reject(err)
                }
                var tmp_path = iconsDir + "/{0}_tmp.png".format(guid)
                fs.rename(tmp_path,tmpOut,function(err){
                  if(err){
                    reject(err)
                  }
                  resolve({"success":true});
                })
              })
            })
          }
        }
      });
    } catch (e) {
      reject(e)
    }
  })
}

