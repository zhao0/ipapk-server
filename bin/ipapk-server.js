#!/usr/bin/env node

var fs = require('fs-extra');
var https = require('https');
var path = require('path');
var exit = process.exit;
var pkg = require('../package.json');
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
var AppBundleInfo = require("app-bundle-info")
var cgbiToPng = require('cgbi-to-png');
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
var db = new sqlite3.Database(serverDir + '/db.sqlite3');
db.run("CREATE TABLE IF NOT EXISTS info (\
  id integer PRIMARY KEY autoincrement,\
  guid TEXT,\
  bundleID TEXT,\
  version TEXT,\
  build TEXT,\
  icon TEXT,\
  name TEXT,\
  uploadTime datetime default (datetime('now', 'localtime')),\
  platform int\
  )");
db.close();
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
  app.get(['/', '/download/:app'], function(req, res, next) {

    fs.readFile(path.join(__dirname, '..', 'templates') + '/download.html', function(err, data) {
      if (err) throw err;
      var template = data.toString();
      var items;
      if (req.params.app === 'apk') {
        items = apksInLocation(apksDir);
      }
      else  {
        items = ipasInLocation(ipasDir);
      }
      items = items.map(function(item) {
        return appInfoWithName(item);
      });
      Promise.all(items).then(function(result) {
        var itemInfos = result.sort(function(a, b) {
          var result = b.time.getTime() - a.time.getTime();
          // if (result > 0) {result = 1} else if (result < 0) { result = -1 };
          return result;
        });
        var info = {};
        info.basePath = basePath;
        info.items = itemInfos;
        var rendered = mustache.render(template, info);
        res.send(rendered);
      });
    })
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
      var guid = Guid.create();
      var new_path;
      if (path.extname(obj.originalFilename) === ".ipa") {
        new_path = path.join(ipasDir, guid + ".ipa");
      } else if (path.extname(obj.originalFilename) === ".apk") {
        new_path = path.join(apksDir, guid + ".apk");
      } else {
        res.send("file type error");
        return;
      }
      fs.rename(tmp_path,new_path,function(err){  
        if(err){  
            throw err;  
        }
      })
      parseIpa(new_path)
      res.send("succeed");
    });
  });

  https.createServer(options, app).listen(port);

}

function appInfoWithName(filename) {
  return new Promise(function(resolve, reject){
    var stat = fs.statSync(filename);
    var time = new Date(stat.mtime);
    var timeString = strftime('%F %H:%M', time);
    var url;
    var name = path.basename(filename, path.extname(filename));
    if (path.extname(filename) === '.ipa') {
      url = "itms-services://?action=download-manifest&url={0}/plist/{1}".format(basePath, name);
    } else {
      url = "{0}/apk/{1}.apk".format(basePath, name);
    }
    resolve({
      name: name,
      description: '更新: ' + timeString,
      time: time,
      url: url,
    })
  });
}

function parseIpa(filename,guiid) {
    var abi = new AppBundleInfo.iOS(fs.createReadStream(filename));
    var info = {}
    abi.getPlist(function(err,data){
        if(err) 
          console.log(err);
        else {
            info["build"] = data.CFBundleVersion,
            info["bundleID"] = data.CFBundleIdentifier,
            info["version"] = data.CFBundleShortVersionString,
            info["name"] = data.CFBundleName
        }
    });
    var ipa = new AdmZip(filename);
    var ipaEntries = ipa.getEntries();
    ipaEntries.forEach(function(ipaEntry) {
      if (ipaEntry.entryName.indexOf('AppIcon60x60@3x.png') != -1) {
        cgbiToPng(new Buffer(ipaEntry.getData()),function(err,pngStream){
          if (err) {console.log(err)}
            // pngStream.pipe(...)
        })
      }
    });
}

function parseText(text,result) {
	var info = text.trim().split(' ');
	for (var i = info.length - 1; i >= 0; i--) {
		var kvs = info[i].split('=');
		if (kvs.length == 2) {
			result[kvs[0]] = kvs[1];
		}
	}
}

