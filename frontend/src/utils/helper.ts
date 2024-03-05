import { Exec, GetEnv } from '@/bridge'

// Permissions Helper
export const SwitchPermissions = async (enable: boolean) => {
  const { basePath, appName } = await GetEnv()
  const command = enable
    ? [
        'add',
        'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
        '/v',
        basePath + '\\' + appName,
        '/t',
        'REG_SZ',
        '/d',
        'RunAsAdmin',
        '/f'
      ]
    : [
        'delete',
        'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
        '/v',
        basePath + '\\' + appName,
        '/f'
      ]
  await Exec('reg', command, true)
}

export const CheckPermissions = async () => {
  const { basePath, appName } = await GetEnv()
  try {
    const out = await Exec(
      'reg',
      [
        'query',
        'HKEY_CURRENT_USER\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers',
        '/v',
        basePath + '\\' + appName,
        '/t',
        'REG_SZ'
      ],
      true
    )
    return out.includes('RunAsAdmin')
  } catch (error) {
    return false
  }
}

// SystemProxy Helper
export const SetSystemProxy = async (enable: boolean, server: string) => {
  await Exec(
    'reg',
    [
      'add',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
      '/v',
      'ProxyEnable',
      '/t',
      'REG_DWORD',
      '/d',
      enable ? '1' : '0',
      '/f'
    ],
    true
  )
  await Exec(
    'reg',
    [
      'add',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
      '/v',
      'ProxyServer',
      '/d',
      enable ? server : '',
      '/f'
    ],
    true
  )
}

export const GetSystemProxy = async () => {
  try {
    const out1 = await Exec(
      'reg',
      [
        'query',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
        '/v',
        'ProxyEnable',
        '/t',
        'REG_DWORD'
      ],
      true
    )

    if (/REG_DWORD\s+0x0/.test(out1)) return ''

    const out2 = await Exec(
      'reg',
      [
        'query',
        'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings',
        '/v',
        'ProxyServer',
        '/t',
        'REG_SZ'
      ],
      true
    )

    const regex = /ProxyServer\s+REG_SZ\s+(\S+)/
    const match = out2.match(regex)

    return match ? match[1] : ''
  } catch (error) {
    console.log('error', error)
    return ''
  }
}

// System ScheduledTask Helper
export const getTaskSchXmlString = async (delay = 30) => {
  const { basePath, appName } = await GetEnv()

  const xml = /*xml*/ `<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>GUI.for.Clash at startup</Description>
    <URI>\\GUI.for.Clash</URI>
  </RegistrationInfo>
  <Triggers>
    <LogonTrigger>
      <Enabled>true</Enabled>
      <Delay>PT${delay}S</Delay>
    </LogonTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>HighestAvailable</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT72H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions Context="Author">
    <Exec>
      <Command>${basePath}\\${appName}</Command>
      <Arguments>tasksch</Arguments>
    </Exec>
  </Actions>
</Task>
`

  return xml
}

export const QuerySchTask = async (taskName: string) => {
  await Exec('Schtasks', ['/Query', '/TN', taskName, '/XML'], true)
}

export const CreateSchTask = async (taskName: string, xmlPath: string) => {
  await Exec('SchTasks', ['/Create', '/F', '/TN', taskName, '/XML', xmlPath], true)
}

export const DeleteSchTask = async (taskName: string) => {
  await Exec('SchTasks', ['/Delete', '/F', '/TN', taskName], true)
}
