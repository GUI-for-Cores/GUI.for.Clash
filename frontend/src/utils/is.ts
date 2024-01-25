import { parse } from 'yaml'

export const isValidBase64 = (str: string) => {
  if (typeof str !== 'string') return false
  if (str === '' || str.trim() === '') {
    return false
  }
  try {
    return btoa(atob(str)) == str
  } catch (err) {
    return false
  }
}

export const isValidSubYAML = (str: string) => {
  if (typeof str !== 'string') return false
  try {
    const { proxies } = parse(str)
    return !!proxies
  } catch (error) {
    return false
  }
}

export const isValidPaylodYAML = (str: string) => {
  try {
    const { payload } = parse(str)
    return !!payload
  } catch (error) {
    return false
  }
}

export const isValidIPCIDR = (str: string) => /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(str)

export const isValidIPV4 = (ip: string) =>
  /^((25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(25[0-5]|2[0-4]\d|[01]?\d\d?)$/.test(ip)
