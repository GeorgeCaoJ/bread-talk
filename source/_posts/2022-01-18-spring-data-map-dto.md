---
layout: post
title: Spring Data JPA映射自定义DTO的两种方法
description: 总结JQPL方式和原生SQL两种映射方法
tags:
- java
- spring
date: 2022-01-18 20:25:10
comments: true
---

## Spring Data JPA数据映射
[Spring Data JPA官方文档中数据投影](https://docs.spring.io/spring-data/jpa/docs/2.4.15/reference/html/#:~:text=getByGroupName(String%20name)%3B%0A%0A%7D-,Projections,-Spring%20Data%20query)介绍了两种方法，一种是基于接口的，一种是基于类的，目的都是将数据库字段映射成数据实体。Spring Data JPA中SQL查询又分为JQPL和原生SQL，不同SQL方式在投影数据对象时的使用方法有些许不同，这里通过我个人实践，基于类的投影分别介绍JQPL方式和原生SQL方式的使用方法。
## JQPL方式映射DTO的方法
以学生的数据实体DO和数据库交互对象DAO为例

``` java
=====================StudentDO.class===================================
@Data
@Entity
@Table(name = "students")
public class StudentDO{
  @Id
  private Long id;
  @Column(name = "c_name")
  private String name;
  @Column(name = "i_age")
  private Integer age;
  @Colunm(name = "c_homeAddress")
  private String homeAddress;
}

=====================StudentDAO.class==================================
public interface StudentDAO extend JpaRepository<StudentDO, Long>{
  
}
```
常见情况是直接获取StudentDO对象所有属性信息，但当只想获取学生的名字和年龄时，希望从数据库中只查询需要的数据，避免无用的字段来占用带宽提高性能，即想获取的数据对象是以下DTO

``` java
public class StudentNameAgeDTO{
  private Long id;
  private String name;
  private Integer age;
  public StudentNameAgeDTO(Long id, String name, Integer age){
    this.id = id;
    this.name = name;
    this.age = age;
  }
}
```
**JPQL方式映射DTO的方法满足以下两个条件即可**：
1. 定义DTO,并声明构造函数（上述DTO已满足）
2. DAO接口对象使用JPQL声明查询SQL,直接在JPQL中调用DTO的构造函数， 如下：
``` java
=====================StudentDAO.class==================================
public interface StudentDAO extend JpaRepository<StudentDO, Long>{
@Query("SELECT new com.example.package.StudentNameAgeDTO(o.id, o.name, o.age) from StudentDO o")
List<StudentNameAgeDTO> findAllStudentNameAge()
}
```

## 原生SQL方式映射DTO的方法
原生SQL的中无法使用类似JPQL调用new构造函数的方式完成数据绑定，JPA 2.1后引入了@SqlResultSetMapping来实现数据绑定，具体方法参考自[How to Return DTOs from Native Queries](https://thorben-janssen.com/spring-data-jpa-dto-native-queries/)，需要满足以下条件：
1. 定义DTO,并声明构造函数（上述DTO已满足）
2. 在已有DAO中声明查询方法使用`@Query( nativeQuery = true)`进行标记
``` java
=====================StudentDAO.class==================================
public interface StudentDAO extend JpaRepository<StudentDO, Long>{
@Query(nativeQuery = true)
List<StudentNameAgeDTO> findAllStudentNameAge()
}
```
3. 在已有DO中使用@NamedNativeQuery将方法与SQL进行绑定,使用@SqlResultSetMapping将自定义的DTO
``` java
=====================StudentDO.class===================================
@NamedNativeQuery(name = "StudentDO.findAllStudentNameAge", //注意，这里是数据库实体对象DO，并不是DAO
query = "SELECT id, c_name as name, i_age as age from students",
resultSetMapping = "com.example.StudentNameAgeDTO")
@SqlResultSetMapping(name = "com.example.StudentNameAgeDTO",
classes = @ConstructorResult(targetClass = StudentNameAgeDTO.class,
columns = {
@ColumnResult(name = "id", type = Long.class),
@ColumnResult(name = "name", type = String.class),
@ColumnResult(name = "age", type = Integer.class)
}
)
)

@Data
@Entity
@Table(name = "students")
public class StudentDO{
@Id
private Long id;
@Column(name = "c_name")
private String name;
@Column(name = "i_age")
private Integer age;
@Colunm(name = "c_homeAddress")
private String homeAddress;
}
```

一种错误使用方法：

``` java
@Query(value = "SELECT id, c_name as name, i_age as age from students", nativeQuery = true)
  List<StudentNameAgeDTO> findAllStudentNameAge()
```
直接在@Query中使用原生sql，但不执行数据绑定，JPA无法自动找到DTO与原生sql的结果数据一一绑定，执行后会报错：

``` shell
org.springframework.core.convert.ConverterNotFoundException: No converter found capable of converting from type [org.springframework.data.jpa.repository.query.AbstractJpaQuery$TupleConverter$TupleBackedMap] to type [com.example.StudentNameAgeDTO]
```
## 总结
Spring Data JPA映射自定义的DTO数据对象符合常见的业务场景需要，上述的两种方式各有优劣，JQPL的方式使用简单且类型安全，缺点是不够灵活，原生SQL的方式足够灵活但是编码上较为冗余，调试定位也较为麻烦，具体按业务场景灵活选用