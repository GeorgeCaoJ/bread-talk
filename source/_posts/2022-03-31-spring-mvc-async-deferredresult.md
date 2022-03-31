---
layout: post
title: Spring MVC异步响应之DeferredResult详解 
description: 源码解读DeferredResult机制
tags:
- java
- async
date: 2022-03-31 19:25:10
comments: true
--

# 
## 同步响应和异步响应 
当前一个api请求到达controller中时，servlet容器便会启动一个线程处理这个请求，从数据库查询到到数据处理然后返回响应都是在当前这个线程进行处理，这个就是同步方式响应。
同步流程图如下：
![sync](/img/java/mvc_sync.png)

当请求量较大，后端业务处理较慢时，大量线程处于阻塞状态，由于请求处理线程数是有限的，其他请求就无法响应了，也就影响了服务器的吞吐能力。这时，提高吞吐量的方式可以修改同步请求为异步响应方式。  
异步流程图如下：
![async](/img/java/mvc_async.png)
以上流程图来源于[博客](https://www.cnblogs.com/guogangj/p/5457959.html)

## 使用DeferredResult完成异步响应
Spring 3.2开始引入了[DeferredResult](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/context/request/async/DeferredResult.html)类方便开发者完成异步响应，开发者只需要几个步骤即可完成异步响应：
1. 在controller中声明DeferredResult,标识此请求是异步模式，当前线程退出时不能提交响应
2. 在其他工作线程中完成任务，并将结果设置到对DeferredResult的对象
3. 返回异步响应对象

举个简单的例子如下：
```java
@RestController
@RequestMapping("/async")
@Slf4j
public class AsyncController {

    private ExecutorService executor;
    @PostConstruct
    public void init(){
        executor = Executors.newFixedThreadPool(3);
    }

    @GetMapping("/delay/hello")
    public DeferredResult<ResponseEntity<String>> getDelayHello(){
        DeferredResult<ResponseEntity<String>> result = new DeferredResult(5000L); //设置5s的超时过期
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS");
        executor.submit(()->{
            try {
                Thread.sleep(3000);  //等待3s，模拟业务处理
                result.setResult(ResponseEntity.ok("hello async, currentTime: " + sdf.format(System.currentTimeMillis())));
            } catch (InterruptedException e) {
                e.printStackTrace();
            }
        });
        log.info("controller thread going on, currentTime:" + sdf.format(System.currentTimeMillis()));
        return result;
    }


}
```
上述简单的示例是先创建一个线程池，来处理具体任务，完成result的设置，请求线程继续执行打印日志。通过http接口测试可以得到结果
日志打印结果：
```shell
controller thread going on, timestamp:2022-03-31 16:44:52.607
```
HTTP响应结果
```shell
hello async, currentTime: 2022-03-31 16:44:55.608
```
可以看到，请求线程正常运行并结束了，但是响应并没有返回，直到线程池中任务完成setResult后，响应才正常返回。从api调用方来看，服务端是正常接受请求并返回响应，但是对于服务端本身，其实是进行了异步处理然后响应的。

## DeferedResult的原理
查看DefferedResult.setResult源码进行分析
```java
public boolean setResult(T result) {
    return setResultInternal(result);
}

private boolean setResultInternal(Object result) {
    // 检查result是否已经设置或者过期
    if (isSetOrExpired()) {
        return false;
    }
    DeferredResultHandler resultHandlerToUse;
    synchronized (this) {
        // 获取锁后进行二次检查，避免线程竞争导致重复设置
        if (isSetOrExpired()) {
            return false;
        }
        // At this point, we got a new result to process
        this.result = result;
        resultHandlerToUse = this.resultHandler;
        // 检查是否注册了结果回调函数
        if (resultHandlerToUse == null) {
            // No result handler set yet -> let the setResultHandler implementation
            // pick up the result object and invoke the result handler for it.
            return true;
        }
        // Result handler available -> let's clear the stored reference since
        // we don't need it anymore.
        this.resultHandler = null;
        }
    // If we get here, we need to process an existing result object immediately.
    // The decision is made within the result lock; just the handle call outside
    // of it, avoiding any deadlock potential with Servlet container locks.
    // 结果回调函数进行处理    
    resultHandlerToUse.handleResult(result);
    return true;
}
```
这里涉及了`resultHandle`这个结果回调函数，那就是这个函数执行了HTTP的响应任务。通过断点在`resultHandlerToUse.handleResult(result);`可以查看到实际具体函数具体是`org.springframework.web.context.request.async.WebAsyncManager.startDeferredResultProcessing`注册的，这个函数的主要作用就是对controller中的DeferredResult进行初始化，并设置reuslt回调处理函数
```java
public void startDeferredResultProcessing(
        final DeferredResult<?> deferredResult, Object... processingContext) throws Exception {

    Assert.notNull(deferredResult, "DeferredResult must not be null");
    Assert.state(this.asyncWebRequest != null, "AsyncWebRequest must not be null");

    Long timeout = deferredResult.getTimeoutValue();
    if (timeout != null) {
        this.asyncWebRequest.setTimeout(timeout); // 从deferredReuslt中获取超时时间，设置给异步request对象
    }

    List<DeferredResultProcessingInterceptor> interceptors = new ArrayList<>();
    interceptors.add(deferredResult.getInterceptor());
    interceptors.addAll(this.deferredResultInterceptors.values());
    interceptors.add(timeoutDeferredResultInterceptor);

    final DeferredResultInterceptorChain interceptorChain = new DeferredResultInterceptorChain(interceptors);

    this.asyncWebRequest.addTimeoutHandler(() -> {
        try {
            interceptorChain.triggerAfterTimeout(this.asyncWebRequest, deferredResult);
        }
        catch (Throwable ex) {
            setConcurrentResultAndDispatch(ex);
        }
    });

    this.asyncWebRequest.addErrorHandler(ex -> {
        if (!this.errorHandlingInProgress) {
            try {
                if (!interceptorChain.triggerAfterError(this.asyncWebRequest, deferredResult, ex)) {
                    return;
                }
                deferredResult.setErrorResult(ex);
            }
            catch (Throwable interceptorEx) {
                setConcurrentResultAndDispatch(interceptorEx);
            }
        }
    });

    this.asyncWebRequest.addCompletionHandler(()
            -> interceptorChain.triggerAfterCompletion(this.asyncWebRequest, deferredResult));

    interceptorChain.applyBeforeConcurrentHandling(this.asyncWebRequest, deferredResult);
    startAsyncProcessing(processingContext);

    try {
        interceptorChain.applyPreProcess(this.asyncWebRequest, deferredResult);
        // 此处通过lamda函数设置resultHandler回调，业务处理线程setResult后便会执行到此处
        deferredResult.setResultHandler(result -> {
            result = interceptorChain.applyPostProcess(this.asyncWebRequest, deferredResult, result);
            setConcurrentResultAndDispatch(result);
        });
    }
    catch (Throwable ex) {
        setConcurrentResultAndDispatch(ex);
    }
}
```
业务处理线程setResult后，便会进入这里的lamda回调函数`setConcurrentResultAndDispatch(result);`，result拿到后继续后续的分派和响应