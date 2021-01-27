---
layout: post
title: IDEA中快速生成数据库映射对象代码的脚本和方法
description: 以目前我常用的spring data jpa为例，分享生成数据库entity的脚本
tags:
- idea
- java
- spring
- jpa
date: 2021-01-27 13:54:36
comments: true
---

使用mybatis框架可以使用常用的[mybatis-generator](http://mybatis.org/generator/)来快速生成对应的数据库对象代码，但使用[Spring Data JPA](https://spring.io/projects/spring-data-jpa)没有一个的通用工具来生成代码，以下介绍一种在IDEA中快速生成代码的方法，可自由定制和修改，按自己的需要生成对应的数据库对象实体代码。  

## 工具和脚本
IDEA自带了**Database Tools and SQL**数据库客户端插件，用于在IDEA中连接和管理数据库，该插件可以通过groovy脚本来快速生成POJO代码, 其自带的`Generate POJOs.groovy`即可生成数据库对象的POJO代码；改造这个脚本，即可实现生成JPA数据库对象实体代码的功能  
Generate Database Entity.groovy脚本如下, 其中Getter和Setter方法使用了常用的lombok来生成：
```groovy
import com.intellij.database.model.DasTable
import com.intellij.database.util.Case
import com.intellij.database.util.DasUtil

/*
 * Available context bindings:
 *   SELECTION   Iterable<DasObject>
 *   PROJECT     project
 *   FILES       files helper
 */


packageParent="src.main.java."

typeMapping = [
  (~/(?i)int/)                      : "Long",
  (~/(?i)tinyint/)                  : "Integer",
  (~/(?i)float|double|decimal|real/): "Double",
  (~/(?i)datetime|timestamp/)       : "java.sql.Timestamp",
  (~/(?i)date/)                     : "java.sql.Date",
  (~/(?i)time/)                     : "java.sql.Time",
  (~/(?i)/)                         : "String"
]

FILES.chooseDirectoryAndSave("Choose directory", "Choose where to store generated files") { dir ->
  SELECTION.filter { it instanceof DasTable }.each { generate(it, dir) }
}

def generate(table, dir) {
  def tableName = table.getName()
  def className = javaName(tableName, true) + "DO"
  def fields = calcFields(table)
  def packageName = dir.toString().replaceAll("\\\\", ".")
  packageName = packageName.substring(packageName.indexOf(packageParent) + packageParent.length())
  new File(dir, className + ".java").withPrintWriter { out -> generate(out,packageName, tableName, className, fields) }
}

def generate(out, packageName, tableName, className, fields) {
  out.println "package $packageName;"
  out.println ""
  out.println "import lombok.Getter;"
  out.println "import lombok.Setter;"
  out.println ""
  out.println "import javax.persistence.Entity;"
  out.println "import javax.persistence.Table;"
  out.println "import javax.persistence.Column;"
  out.println ""
  out.println "@Setter"
  out.println "@Getter"
  out.println "@Entity"
  out.println "@Table(name = \"${tableName}\")"
  out.println "public class $className {"
  out.println ""
  fields.each() {
    if (it.annos != "") out.println "    ${it.annos}"
    out.println "    private ${it.type} ${it.name};"
    out.println ""
  }
  out.println ""
  out.println "}"
}

def calcFields(table) {
  DasUtil.getColumns(table).reduce([]) { fields, col ->
    def spec = Case.LOWER.apply(col.getDataType().getSpecification())
    def typeStr = typeMapping.find { p, t -> p.matcher(spec).find() }.value
    fields += [[
                 name : javaName(col.getName(), false),
                 type : typeStr,
                 annos: "@Column(name = \"${col.getName()}\")"
                 ]]
  }
}

def javaName(str, capitalize) {
  def nameArray = com.intellij.psi.codeStyle.NameUtil.splitNameIntoWords(str)
  //省略无意义的
  def validNameArray = []
  nameArray.each(){
    if (it.length() > 1){
      validNameArray.add(it)
    }
  }
  def s = validNameArray
    .collect { Case.LOWER.apply(it).capitalize() }
    .join("")
    .replaceAll(/[^\p{javaJavaIdentifierPart}[_]]/, "_")
  capitalize || s.length() == 1? s : Case.LOWER.apply(s[0]) + s[1..-1]
}
```
## 使用方法
将上述脚本放在`C:\Users\george\.IntelliJIdea2019.3\config\extensions\com.intellij.database\schema`文件中，与默认的`Generate POJOs.groovy`脚本在同一个目录，然后在**database**视图栏中选中要生成的表，右键选择执行脚本，选择目标包路径即可生成代码到指定的包
![script](/img/idea/script.jpg)