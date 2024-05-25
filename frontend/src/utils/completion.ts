import type { CompletionContext, Completion } from '@codemirror/autocomplete'
import { snippetCompletion, completeFromList } from '@codemirror/autocomplete'
import { scopeCompletionSource, localCompletionSource, snippets } from '@codemirror/lang-javascript'

import i18n from '@/lang'

export const getCompletions = (pluginScope: any = undefined) => {
  const { t } = i18n.global

  console.log(pluginScope)

  const snippetsCompletions: Completion[] = [
    /**
     * Built-In
     */
    ...snippets,
    /**
     * Plugin Triggers
     */
    snippetCompletion(
      `/* ${t('plugin.trigger') + ' ' + t('common.install')} */\n` +
        'const onInstall = async () => {\n\t${}\n\treturn 0\n}',
      {
        label: 'onInstall',
        type: 'keyword',
        detail: t('plugin.trigger') + ' ' + t('common.install')
      }
    ),
    snippetCompletion(
      `/* ${t('plugin.trigger') + ' ' + t('common.uninstall')} */\n` +
        'const onUninstall = async () => {\n\t${}\n\treturn 0\n}',
      {
        label: 'onUninstall',
        type: 'keyword',
        detail: t('plugin.trigger') + ' ' + t('common.uninstall')
      }
    ),
    snippetCompletion(
      `/* ${t('plugin.trigger') + ' ' + t('plugin.on::manual')} */\n` +
        'const onRun = async () => {\n\t${}\n}',
      {
        label: 'onRun',
        type: 'keyword',
        detail: t('plugin.trigger') + ' ' + t('plugin.on::manual')
      }
    ),
    snippetCompletion(
      `/* ${t('plugin.trigger') + ' ' + t('plugin.on::subscribe')} */\n` +
        'const onSubscribe = async (proxies, subscription) => {\n\t${}\n}',
      {
        label: 'onSubscribe',
        type: 'keyword',
        detail: t('plugin.trigger') + ' ' + t('plugin.on::subscribe')
      }
    ),
    snippetCompletion(
      `/* ${t('plugin.trigger') + ' ' + t('plugin.on::generate')} */\n` +
        'const onGenerate = async (config, profile) => {\n\t${}\n}',
      {
        label: 'onGenerate',
        type: 'keyword',
        detail: t('plugin.trigger') + ' ' + t('plugin.on::generate')
      }
    ),
    snippetCompletion(
      `/* ${t('plugin.trigger') + ' ' + t('plugin.on::startup')} */\n` +
        'const onStartup = async () => {\n\t${}\n}',
      {
        label: 'onStartup',
        type: 'keyword',
        detail: t('plugin.trigger') + ' ' + t('plugin.on::startup')
      }
    ),
    snippetCompletion(
      `/* ${t('plugin.trigger') + ' ' + t('plugin.on::shutdown')} */\n` +
        'const onShutdown = async () => {\n\t${}\n}',
      {
        label: 'onShutdown',
        type: 'keyword',
        detail: t('plugin.trigger') + ' ' + t('plugin.on::shutdown')
      }
    ),
    snippetCompletion(
      `/* ${t('plugin.trigger') + ' ' + t('plugin.on::ready')} */\n` +
        'const onReady = async () => {\n\t${}\n}',
      {
        label: 'onReady',
        type: 'keyword',
        detail: t('plugin.trigger') + ' ' + t('plugin.on::ready')
      }
    )
  ]

  const completions = [
    /**
     * Global methods include all APIs of `Plugins` and `Plugin Metadata`
     */
    scopeCompletionSource({ ...window, Plugin: pluginScope }),
    /**
     * Code Snippets
     */
    completeFromList(snippetsCompletions),
    /**
     * Locally Defined
     */
    (context: CompletionContext) => {
      const word = context.matchBefore(/\w*/)
      if (!word || context.explicit) return null

      const codeCompletion = localCompletionSource(context) || { options: [] }

      return {
        from: word.from,
        options: codeCompletion.options
      }
    }
  ]

  return completions
}
