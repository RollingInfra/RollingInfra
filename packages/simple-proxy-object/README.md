# Simple Proxy Object

A simple way to create a proxy object by providing a function to call on property access.

## Usage

```ts
import createSimpleProxyObject from '@rollinginfra/simple-proxy-object';

const reflect = createSimpleProxyObject({
  hasProp(_prop) {
    return true;
  },
  getProp(prop) {
    return prop;
  },
});
console.log(reflect.hello);
console.log(reflect.world);
```
