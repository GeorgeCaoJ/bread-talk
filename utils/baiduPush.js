/**
 * 生成百度链接推送文件
 */
const fs = require('fs');
const path = require('path');
const chalk = require('chalk')
const readFileList = require('./modules/readFileList');
const urlsRoot = path.join(__dirname, '..', 'urls.txt'); // 百度链接推送文件
const publicPath = path.join(path.dirname(urlsRoot), 'public')
// const DOMAIN = "https://bread-whisper.now.sh"
const DOMAIN = process.argv.splice(2)[0]; // 获取命令行传入的参数

if (!DOMAIN) {
  console.log(chalk.red('请在运行此文件时指定一个你要进行百度推送的域名参数，例：node utils/baiduPush.js https://xugaoyi.com'))
  return
}

main();

/**
 * 主体函数
 */
function main() {
    fs.writeFileSync(urlsRoot, DOMAIN)
    const files = readFileList(); // 读取所有md文件数据
    
    files.forEach( file => {
        let link = file.filePath.replace(publicPath, '\r\n' + DOMAIN)
        // const link = '\r\n' + DOMAIN + file.filePath
        console.log(link)
        fs.appendFileSync(urlsRoot, link);
    })
}