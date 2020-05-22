/**
 * 读取所有hexo生成的博客html地址
 */

 const fs = require('fs'); // 文件模块
 const path = require('path'); // 路径模块
 const docsRoot = path.join(__dirname, '..', '..', 'public'); // 博客html根目录
 const minYear = "1977";
 const maxYear = "9999"; 

 function readFileList(dir = docsRoot, filesList = []){
    return doReadFileList(false, docsRoot, filesList) 
 }

 function doReadFileList(yearFiltered, dir = docsRoot, filesList = [] ){
     const files = fs.readdirSync(dir);
     files.forEach((item, index) =>{
         let filePath = path.join(dir, item);
         const stat = fs.statSync(filePath);
         if (stat.isDirectory()){
             if (!yearFiltered){ // 按年份过滤文件夹，非年份的文件夹不属于博客页
                if (item >= minYear && item <= maxYear){
                    doReadFileList(true, filePath, filesList); //只过滤一次
                } else{
                    return;
                }
             } else {
                 doReadFileList(yearFiltered, filePath, filesList);
             }
         } else{
             if (!yearFiltered){
                 return;
             } else{
                 filesList.push({item, filePath});
             }
         }
     })
     return filesList;
 }

 module.exports = readFileList;