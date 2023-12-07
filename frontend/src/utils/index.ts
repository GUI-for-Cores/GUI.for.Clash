export const deepClone = <T>(json: T): T => JSON.parse(JSON.stringify(json))

export const debounce = (fn: (...args: any) => any, wait: number) => {
  let timer: null | number = null
  const _debuonce = function (...args: any) {
    return new Promise((resolve) => {
      timer && clearTimeout(timer)
      timer = setTimeout(() => {
        fn(...args)
        resolve(null)
      }, wait)
    })
  }
  _debuonce.cancel = function () {
    timer && clearTimeout(timer)
    timer = null
  }
  return _debuonce
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const ignoredError = async <T>(fn: (...args: any) => Promise<T>, ...args: any) => {
  try {
    const res = await fn(...args)
    return res
  } catch (error) {
    // console.log(error)
  }
}

export const sampleID = () => 'ID_' + Math.random().toString(36).substring(2, 10)

export const getValue = (obj: Record<string, any>, expr: string) => {
  return expr.split('.').reduce((value, key) => {
    return value[key]
  }, obj)
}
