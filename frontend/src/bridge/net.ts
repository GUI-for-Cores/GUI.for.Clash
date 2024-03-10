import { sampleID } from '@/utils'
import * as App from '@wails/go/bridge/App'
import { GetSystemProxy } from '@/utils/helper'
import { EventsOn, EventsOff } from '@wails/runtime/runtime'

type DownloadProgressCallback = (progress: number, total: number) => void

type HttpResult = { header: Record<string, string>; body: any }

export const Download = async (url: string, path: string, progress?: DownloadProgressCallback) => {
  const proxy = await GetSystemProxy()
  const event = progress ? sampleID() : ''
  if (event && progress) EventsOn(event, progress)
  const { flag, data } = await App.Download(url, path, event, proxy)
  if (event) EventsOff(event)
  if (!flag) {
    throw data
  }
  return data
}

export const Upload = async (url: string, path: string, headers = {}): Promise<HttpResult> => {
  const proxy = await GetSystemProxy()
  const { flag, header, body } = await App.Upload(url, path, headers, proxy)
  if (!flag) {
    throw body
  }
  Object.entries(header).forEach(([key, value]) => (header[key] = value[0] as any))
  if (header['Content-Type']?.includes('application/json')) {
    return { header: header as unknown as HttpResult['header'], body: JSON.parse(body) }
  }
  return { header: header as unknown as HttpResult['header'], body }
}

export const HttpGet = async (url: string, headers = {}): Promise<HttpResult> => {
  const proxy = await GetSystemProxy()
  const { flag, header, body } = await App.HttpGet(url, headers, proxy)
  if (!flag) {
    throw body
  }
  Object.entries(header).forEach(([key, value]) => (header[key] = value[0] as any))
  if (header['Content-Type']?.includes('application/json')) {
    return { header: header as unknown as HttpResult['header'], body: JSON.parse(body) }
  }
  return { header: header as unknown as HttpResult['header'], body }
}

export const HttpPost = async (url: string, headers = {}, body = {}): Promise<HttpResult> => {
  const proxy = await GetSystemProxy()
  const {
    flag,
    header,
    body: _body
  } = await App.HttpPost(url, headers, JSON.stringify(body), proxy)
  if (!flag) {
    throw _body
  }
  Object.entries(header).forEach(([key, value]) => (header[key] = value[0] as any))
  if (header['Content-Type']?.includes('application/json')) {
    return { header: header as unknown as HttpResult['header'], body: JSON.parse(_body) }
  }
  return { header: header as unknown as HttpResult['header'], body: _body }
}
