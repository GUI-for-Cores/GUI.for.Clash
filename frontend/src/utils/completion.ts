import type {
  CompletionContext,
  CompletionResult,
  CompletionSource
} from '@codemirror/autocomplete'

type CompletionsGroup = {
  groupName: string
  options: CompletionResult['options']
}

const processCompletions = (groups: CompletionsGroup[]) => {
  const result: CompletionSource[] = []

  groups.forEach((group) => {
    result.push((context: CompletionContext) => {
      const labels = group.options.map((v) => v.label)
      const pattern = labels.reduce((p, c, i) => {
        const chars = c.split('')
        const cc = chars
          .reverse()
          .reduce((p, c, i) => {
            const isLast = i === chars.length - 1
            return (isLast ? '' : '(') + `${c}${p}` + (isLast ? '' : ')')
          }, '')
          .replace(/\)/g, '?)')
        return p + cc + (i === labels.length - 1 ? '' : '|')
      }, '')

      const regExp = new RegExp(pattern, 'i')

      const word = context.matchBefore(regExp)
      if (!word || context.explicit) return null
      return { from: word.from ? word.from : context.pos, options: group.options }
    })
  })

  return result
}

export const getCompletions = () => {
  const rawCompletions: CompletionsGroup[] = [
    {
      groupName: 'Triggers',
      options: [
        {
          label: 'onRun',
          type: 'function',
          apply: 'const onRun = async () => {}\n',
          detail: 'on::manual'
        },
        {
          label: 'onSubscribe',
          type: 'function',
          apply: 'const onSubscribe = async () => {}\n',
          detail: 'on::subscribe'
        },
        {
          label: 'onGenerate',
          type: 'function',
          apply: 'const onGenerate = async () => {}\n',
          detail: 'on::generate'
        },
        {
          label: 'onStartup',
          type: 'function',
          apply: 'const onStartup = async () => {}\n',
          detail: 'on::startup'
        },
        {
          label: 'onShutdown',
          type: 'function',
          apply: 'const onShutdown = async () => {}\n',
          detail: 'on::shutdown'
        },
        {
          label: 'onReady',
          type: 'function',
          apply: 'const onReady = async () => {}\n',
          detail: 'on::ready'
        }
      ]
    },
    {
      groupName: 'IO',
      options: [
        {
          label: 'Plugins.Readfile',
          type: 'function',
          apply: "Plugins.Readfile('')"
        },
        {
          label: 'Plugins.Writefile',
          type: 'function',
          apply: "Plugins.Writefile('')"
        }
      ]
    }
  ]

  return processCompletions(rawCompletions)
}
