import { parse } from 'yaml'

export const isValidBase64 = (str: string) => {
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
  try {
    const { proxies } = parse(str)
    return proxies
  } catch (error) {
    return false
  }
}
