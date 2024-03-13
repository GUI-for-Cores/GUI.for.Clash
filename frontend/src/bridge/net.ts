import { sampleID, getUserAgent } from '@/utils'
import * as App from '@wails/go/bridge/App'
import { GetSystemProxy } from '@/utils/helper'
import { EventsOn, EventsOff } from '@wails/runtime/runtime'

type RequestProgressCallback = (progress: number, total: number) => void

type HttpHeader = {
  'Content-Type'?: 'application/json' | 'application/x-www-form-urlencoded'
} & Record<string, string>

type HttpResult = { header: Record<string, string>; body: any }

const transformRequest = (header: Record<string, string>, body: any) => {
  switch (header['Content-Type']) {
    case 'application/json': {
      body = JSON.stringify(body)
      break
    }
    case 'application/x-www-form-urlencoded': {
      const usp = new URLSearchParams()
      Object.entries(body).forEach(([key, value]: any) => usp.append(key, value))
      body = usp.toString()
      break
    }
  }
  return { header, body }
}

const transformResponse = (header: Record<string, string[]>, body: string) => {
  Object.entries(header).forEach(([key, value]) => (header[key] = value[0] as any))

  if (header['Content-Type']?.includes('application/json')) {
    return {
      header: header as unknown as HttpResult['header'],
      body: JSON.parse(body) as Record<string, any> | Record<string, any>[]
    }
  }

  return { header: header as unknown as HttpResult['header'], body }
}

export const Download = async (
  url: string,
  path: string,
  headers: HttpHeader = {},
  progress?: RequestProgressCallback
) => {
  const proxy = await GetSystemProxy()
  const event = progress ? sampleID() : ''
  headers = { 'User-Agent': getUserAgent(), ...headers }

  progress && EventsOn(event, progress)

  const { flag, header, body } = await App.Download(url, path, headers, event, proxy)

  progress && EventsOff(event)

  if (!flag) throw body

  return transformResponse(header, body)
}

export const Upload = async (
  url: string,
  path: string,
  headers: HttpHeader = {},
  progress?: RequestProgressCallback
) => {
  const proxy = await GetSystemProxy()
  const event = progress ? sampleID() : ''
  headers = { 'User-Agent': getUserAgent(), ...headers }

  progress && EventsOn(event, progress)

  const { flag, header, body } = await App.Upload(url, path, headers, event, proxy)

  progress && EventsOff(event)

  if (!flag) throw body

  return transformResponse(header, body)
}

export const HttpGet = async (url: string, headers = {}) => {
  const proxy = await GetSystemProxy()
  headers = { 'User-Agent': getUserAgent(), ...headers }

  const { flag, header, body } = await App.HttpGet(url, headers, proxy)
  if (!flag) {
    throw body
  }

  return transformResponse(header, body)
}

export const HttpPost = async (url: string, headers = {}, body = {}) => {
  const proxy = await GetSystemProxy()
  const { body: bodyStr } = transformRequest(headers, body)

  const { flag, header, body: _body } = await App.HttpPost(url, headers, bodyStr, proxy)
  if (!flag) {
    throw _body
  }

  return transformResponse(header, _body)
}
